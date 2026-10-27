from __future__ import annotations

from functools import lru_cache
from os import getenv
from pathlib import Path

import joblib
import librosa
import numpy as np
from scipy.signal import butter, find_peaks, hilbert, sosfiltfilt


TARGET_SAMPLE_RATE = 2000
MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "heart_model.joblib"
LEGACY_MODEL_PATH = MODEL_DIR / "heart_rf.joblib"
ABNORMAL_THRESHOLD = float(getenv("HEART_IQ_ABNORMAL_THRESHOLD", "0.83"))


class AnalysisError(Exception):
    pass


def load_audio(file_path: Path) -> np.ndarray:
    try:
        signal, _ = librosa.load(file_path, sr=TARGET_SAMPLE_RATE, mono=True)
    except Exception as exc:
        raise AnalysisError("Unable to read WAV audio. Please upload a valid file.") from exc

    if signal.size == 0:
        raise AnalysisError("Uploaded audio file is empty.")

    return signal.astype(np.float32)


def bandpass_filter(signal: np.ndarray) -> np.ndarray:
    sos = butter(4, [25, 400], btype="bandpass", fs=TARGET_SAMPLE_RATE, output="sos")
    return sosfiltfilt(sos, signal).astype(np.float32)


def peak_normalize(signal: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(signal))) if signal.size else 0.0
    if peak <= 0:
        return signal
    return (signal / peak).astype(np.float32)


def extract_mfcc(signal: np.ndarray) -> np.ndarray:
    mfcc = librosa.feature.mfcc(y=signal, sr=TARGET_SAMPLE_RATE, n_mfcc=13, n_fft=512, hop_length=128)
    return np.mean(mfcc, axis=1).astype(np.float32)


def estimate_bpm(signal: np.ndarray) -> int:
    bpm, _ = estimate_bpm_details(signal)
    return bpm


def estimate_bpm_details(signal: np.ndarray) -> tuple[int, dict[str, float]]:
    envelope = np.abs(hilbert(signal))
    smooth_window = max(5, int(TARGET_SAMPLE_RATE * 0.05))
    kernel = np.ones(smooth_window, dtype=np.float32) / smooth_window
    smoothed = np.convolve(envelope, kernel, mode="same")

    min_distance = int(TARGET_SAMPLE_RATE * 0.35)
    prominence = max(0.03, float(np.percentile(smoothed, 75) * 0.35))
    peaks, _ = find_peaks(smoothed, distance=min_distance, prominence=prominence)

    rr_intervals = np.array([], dtype=np.float32)
    if peaks.size >= 2:
        rr_intervals = np.diff(peaks).astype(np.float32) / TARGET_SAMPLE_RATE
        bpm = int(np.clip(60.0 / np.mean(rr_intervals), 35, 180))
    else:
        autocorr = np.correlate(smoothed, smoothed, mode="full")[smoothed.size - 1 :]
        lag_min = int(TARGET_SAMPLE_RATE * 0.35)
        lag_max = min(int(TARGET_SAMPLE_RATE * 1.5), autocorr.size - 1)
        if lag_max > lag_min:
            lag = np.argmax(autocorr[lag_min:lag_max]) + lag_min
            bpm = int(np.clip(60.0 * TARGET_SAMPLE_RATE / max(lag, 1), 35, 180))
        else:
            bpm = 72

    return bpm, {
        "peak_count": float(peaks.size),
        "rr_mean": float(np.mean(rr_intervals)) if rr_intervals.size else 0.0,
        "rr_std": float(np.std(rr_intervals)) if rr_intervals.size else 0.0,
        "rr_median": float(np.median(rr_intervals)) if rr_intervals.size else 0.0,
        "envelope_mean": float(np.mean(smoothed)),
        "envelope_std": float(np.std(smoothed)),
        "envelope_p90": float(np.percentile(smoothed, 90)),
    }


def spectral_energy_bands(signal: np.ndarray) -> tuple[float, float, float]:
    spectrum = np.abs(np.fft.rfft(signal))
    freqs = np.fft.rfftfreq(signal.size, d=1 / TARGET_SAMPLE_RATE)
    total = float(np.sum(spectrum) + 1e-8)

    low = float(np.sum(spectrum[(freqs >= 25) & (freqs < 120)]) / total)
    mid = float(np.sum(spectrum[(freqs >= 120) & (freqs < 250)]) / total)
    high = float(np.sum(spectrum[(freqs >= 250) & (freqs <= 400)]) / total)
    return low, mid, high


def energy_entropy(signal: np.ndarray) -> float:
    spectrum = np.abs(np.fft.rfft(signal)).astype(np.float64)
    power = np.square(spectrum)
    power /= np.sum(power) + 1e-12
    return float(-np.sum(power * np.log2(power + 1e-12)))


def compute_feature_summary(signal: np.ndarray, bpm: int, bpm_details: dict[str, float]) -> dict[str, np.ndarray | float]:
    mfcc_full = librosa.feature.mfcc(y=signal, sr=TARGET_SAMPLE_RATE, n_mfcc=13, n_fft=512, hop_length=128)
    delta = librosa.feature.delta(mfcc_full)
    delta2 = librosa.feature.delta(mfcc_full, order=2)

    centroid = librosa.feature.spectral_centroid(y=signal, sr=TARGET_SAMPLE_RATE)[0]
    bandwidth = librosa.feature.spectral_bandwidth(y=signal, sr=TARGET_SAMPLE_RATE)[0]
    rolloff = librosa.feature.spectral_rolloff(y=signal, sr=TARGET_SAMPLE_RATE, roll_percent=0.85)[0]
    contrast = librosa.feature.spectral_contrast(
        y=signal,
        sr=TARGET_SAMPLE_RATE,
        n_fft=512,
        hop_length=128,
        fmin=30.0,
        n_bands=4,
    )
    flatness = librosa.feature.spectral_flatness(y=signal)[0]
    rms = librosa.feature.rms(y=signal)[0]
    zcr = librosa.feature.zero_crossing_rate(y=signal)[0]
    low, mid, high = spectral_energy_bands(signal)

    return {
        "bpm": float(bpm),
        "mfcc_mean": np.mean(mfcc_full, axis=1).astype(np.float32),
        "mfcc_std": np.std(mfcc_full, axis=1).astype(np.float32),
        "mfcc_delta_mean": np.mean(delta, axis=1).astype(np.float32),
        "mfcc_delta2_mean": np.mean(delta2, axis=1).astype(np.float32),
        "centroid_mean": float(np.mean(centroid)),
        "bandwidth_mean": float(np.mean(bandwidth)),
        "rolloff_mean": float(np.mean(rolloff)),
        "contrast_mean": float(np.mean(contrast)),
        "contrast_std": float(np.std(contrast)),
        "flatness_mean": float(np.mean(flatness)),
        "rms_mean": float(np.mean(rms)),
        "rms_std": float(np.std(rms)),
        "zcr_mean": float(np.mean(zcr)),
        "low_band": low,
        "mid_band": mid,
        "high_band": high,
        "low_mid_ratio": float(low / max(mid, 1e-6)),
        "mid_high_ratio": float(mid / max(high, 1e-6)),
        "energy_entropy": energy_entropy(signal),
        "peak_count": bpm_details["peak_count"],
        "rr_mean": bpm_details["rr_mean"],
        "rr_std": bpm_details["rr_std"],
        "rr_median": bpm_details["rr_median"],
        "envelope_mean": bpm_details["envelope_mean"],
        "envelope_std": bpm_details["envelope_std"],
        "envelope_p90": bpm_details["envelope_p90"],
    }


def get_feature_names() -> list[str]:
    names = [
        "bpm",
        "centroid_mean",
        "bandwidth_mean",
        "rolloff_mean",
        "contrast_mean",
        "contrast_std",
        "flatness_mean",
        "rms_mean",
        "rms_std",
        "zcr_mean",
        "low_band",
        "mid_band",
        "high_band",
        "low_mid_ratio",
        "mid_high_ratio",
        "energy_entropy",
        "peak_count",
        "rr_mean",
        "rr_std",
        "rr_median",
        "envelope_mean",
        "envelope_std",
        "envelope_p90",
    ]
    names.extend([f"mfcc_mean_{index + 1}" for index in range(13)])
    names.extend([f"mfcc_std_{index + 1}" for index in range(13)])
    names.extend([f"mfcc_delta_mean_{index + 1}" for index in range(13)])
    names.extend([f"mfcc_delta2_mean_{index + 1}" for index in range(13)])
    return names


def build_feature_vector(signal: np.ndarray, mfcc: np.ndarray, bpm: int) -> np.ndarray:
    bpm_details = estimate_bpm_details(signal)[1]
    return build_feature_vector_from_summary(compute_feature_summary(signal, bpm, bpm_details))


def build_feature_vector_from_summary(summary: dict[str, np.ndarray | float]) -> np.ndarray:
    feature_vector = np.array(
        [
            float(summary["bpm"]),
            float(summary["centroid_mean"]),
            float(summary["bandwidth_mean"]),
            float(summary["rolloff_mean"]),
            float(summary["contrast_mean"]),
            float(summary["contrast_std"]),
            float(summary["flatness_mean"]),
            float(summary["rms_mean"]),
            float(summary["rms_std"]),
            float(summary["zcr_mean"]),
            float(summary["low_band"]),
            float(summary["mid_band"]),
            float(summary["high_band"]),
            float(summary["low_mid_ratio"]),
            float(summary["mid_high_ratio"]),
            float(summary["energy_entropy"]),
            float(summary["peak_count"]),
            float(summary["rr_mean"]),
            float(summary["rr_std"]),
            float(summary["rr_median"]),
            float(summary["envelope_mean"]),
            float(summary["envelope_std"]),
            float(summary["envelope_p90"]),
            *np.asarray(summary["mfcc_mean"], dtype=np.float32).tolist(),
            *np.asarray(summary["mfcc_std"], dtype=np.float32).tolist(),
            *np.asarray(summary["mfcc_delta_mean"], dtype=np.float32).tolist(),
            *np.asarray(summary["mfcc_delta2_mean"], dtype=np.float32).tolist(),
        ],
        dtype=np.float32,
    )
    return feature_vector


@lru_cache(maxsize=1)
def load_classifier():
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    if LEGACY_MODEL_PATH.exists():
        return joblib.load(LEGACY_MODEL_PATH)
    return None


def heuristic_prediction(feature_vector: np.ndarray) -> tuple[str, float]:
    bpm = float(feature_vector[0])
    centroid = float(feature_vector[1])
    rms_std = float(feature_vector[8])
    high_energy = float(feature_vector[12])
    rr_std = float(feature_vector[18])
    flatness = float(feature_vector[6])

    abnormal_markers = 0
    if bpm < 55 or bpm > 105:
        abnormal_markers += 1
    if centroid > 165:
        abnormal_markers += 1
    if rms_std > 0.11:
        abnormal_markers += 1
    if high_energy > 0.22:
        abnormal_markers += 1
    if rr_std > 0.12:
        abnormal_markers += 1
    if flatness > 0.045:
        abnormal_markers += 1

    diagnosis = "Abnormal" if abnormal_markers >= 3 else "Normal"
    confidence = float(np.clip(0.6 + abnormal_markers * 0.07, 0.6, 0.96))
    return diagnosis, confidence


def confidence_score(signal: np.ndarray) -> float:
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=signal, sr=TARGET_SAMPLE_RATE)))
    low, mid, high = spectral_energy_bands(signal)
    centroid_score = np.clip(1.0 - abs(centroid - 115.0) / 140.0, 0.25, 1.0)
    energy_balance = np.clip((low * 0.5) + (mid * 0.35) + (1.0 - high) * 0.15, 0.2, 1.0)
    return float(np.clip((centroid_score * 0.55) + (energy_balance * 0.45), 0.3, 0.98))


def build_recommendation(diagnosis: str, bpm: int, confidence: float) -> str:
    if diagnosis == "Abnormal":
        if bpm > 100:
            return "Potential arrhythmia pattern detected by acoustic screening. Clinical consultation advised."
        if bpm < 55:
            return "Low-cadence abnormality detected by acoustic screening. Further cardiovascular review advised."
        if confidence < 0.7:
            return "Abnormal acoustic signature detected with moderate confidence. Repeat capture and seek confirmatory review."
        return "Acoustic abnormality detected by screening. Recommend physician follow-up and confirmatory testing."

    if confidence < 0.6:
        return "Signal appears broadly normal, but the recording quality suggests repeating the capture."
    return "No high-risk abnormality flagged by the acoustic screening. Continue routine monitoring."


def build_twin_state(summary: dict[str, np.ndarray | float], diagnosis: str, bpm: int, confidence: float, snr_proxy: float) -> dict:
    rr_std = float(summary["rr_std"])
    high_band = float(summary["high_band"])
    mid_band = float(summary["mid_band"])
    low_band = float(summary["low_band"])
    flatness = float(summary["flatness_mean"])
    entropy = float(summary["energy_entropy"])
    centroid = float(summary["centroid_mean"])
    rms_std = float(summary["rms_std"])

    if bpm >= 100:
        rhythm_state = "tachycardia"
    elif bpm <= 55:
        rhythm_state = "bradycardia"
    elif rr_std > 0.12:
        rhythm_state = "irregular"
    else:
        rhythm_state = "regular"

    murmur_intensity = float(np.clip((high_band * 1.65) + (flatness * 4.0) + (rms_std * 2.25), 0.0, 1.0))
    turbulence = float(np.clip((high_band * 1.35) + (mid_band * 0.55) + (centroid / 420.0) + (entropy / 18.0), 0.0, 1.0))
    signal_quality = float(np.clip((snr_proxy / 18.0 * 0.58) + (confidence * 0.42), 0.0, 1.0))
    pulse_variation = float(np.clip(0.02 + rr_std * 0.12 + turbulence * 0.08, 0.02, 0.18))
    glow_strength = float(np.clip((murmur_intensity * 0.42) + ((1.0 - signal_quality) * 0.28) + (confidence * 0.22), 0.18, 1.0))
    if diagnosis == "Abnormal":
        visual_state = "alert"
    elif signal_quality < 0.45 or confidence < 0.5:
        visual_state = "caution"
    else:
        visual_state = "normal"

    if high_band > 0.18 or centroid > 185:
        acoustic_focus = "aortic"
    elif mid_band > 0.25:
        acoustic_focus = "pulmonic"
    elif low_band > 0.72 and rr_std > 0.08:
        acoustic_focus = "mitral"
    else:
        acoustic_focus = "tricuspid" if diagnosis == "Abnormal" else "mitral"

    return {
        "rhythm_state": rhythm_state,
        "murmur_intensity": round(murmur_intensity, 3),
        "turbulence": round(turbulence, 3),
        "signal_quality": round(signal_quality, 3),
        "confidence": round(float(confidence), 3),
        "visual_state": visual_state,
        "pulse_variation": round(pulse_variation, 3),
        "glow_strength": round(glow_strength, 3),
        "acoustic_focus": acoustic_focus,
        "s1_phase": 0.08,
        "s2_phase": 0.3,
        "rr_variability": round(rr_std, 4),
        "interpretation": f"{visual_state.title()} acoustic motion with {acoustic_focus} focus and {round(murmur_intensity * 100)}% murmur-energy overlay.",
    }


def build_signal_quality(snr_proxy: float, summary: dict[str, np.ndarray | float]) -> dict:
    flatness = float(summary["flatness_mean"])
    envelope_std = float(summary["envelope_std"])
    score = float(np.clip((snr_proxy / 18.0 * 0.62) + ((1.0 - min(flatness * 18.0, 1.0)) * 0.22) + (min(envelope_std * 6.0, 1.0) * 0.16), 0.0, 1.0))
    label = "good" if score >= 0.72 else "moderate" if score >= 0.45 else "poor"
    return {
        "score": round(score, 3),
        "label": label,
        "snr_proxy": snr_proxy,
        "flatness": round(flatness, 5),
    }


def build_severity(diagnosis: str, confidence: float, twin_state: dict, bpm: int) -> dict:
    rhythm_pressure = 0.22 if bpm > 100 or bpm < 55 else 0.0
    abnormal_base = 0.35 if diagnosis == "Abnormal" else 0.08
    score = float(
        np.clip(
            abnormal_base
            + confidence * 0.34
            + float(twin_state["murmur_intensity"]) * 0.24
            + float(twin_state["turbulence"]) * 0.18
            + rhythm_pressure,
            0.0,
            1.0,
        )
    )
    label = "high" if score >= 0.72 else "moderate" if score >= 0.42 else "low"
    return {
        "score": round(score, 3),
        "label": label,
    }


def build_explainability(summary: dict[str, np.ndarray | float], twin_state: dict, confidence: float) -> list[dict[str, float | str]]:
    factors = [
        {
            "feature": "Abnormal model confidence",
            "impact": round(float(confidence), 3),
            "reason": "Classifier probability and signal confidence support this prediction.",
        },
        {
            "feature": "Murmur energy overlay",
            "impact": float(twin_state["murmur_intensity"]),
            "reason": "High-frequency energy, spectral flatness, and RMS variation suggest turbulent acoustic content.",
        },
        {
            "feature": "Rhythm variability",
            "impact": round(float(np.clip(float(summary["rr_std"]) / 0.18, 0.0, 1.0)), 3),
            "reason": "Envelope peak spacing is used to estimate whether the acoustic rhythm is regular or unstable.",
        },
        {
            "feature": "Spectral turbulence",
            "impact": float(twin_state["turbulence"]),
            "reason": "Centroid, entropy, and mid/high energy distribution shape the turbulence layer on the twin.",
        },
        {
            "feature": "Signal quality",
            "impact": float(twin_state["signal_quality"]),
            "reason": "SNR proxy and envelope consistency indicate how reliable the acoustic screen is.",
        },
    ]
    return sorted(factors, key=lambda item: float(item["impact"]), reverse=True)[:4]


def summarize_waveform(signal: np.ndarray, points: int = 180) -> list[float]:
    if signal.size <= points:
        return [round(float(value), 5) for value in signal]

    chunk_size = signal.size // points
    trimmed = signal[: chunk_size * points].reshape(points, chunk_size)
    reduced = np.mean(trimmed, axis=1)
    return [round(float(value), 5) for value in reduced]


def analyze_wav_file(file_path: Path) -> dict:
    raw_signal = load_audio(file_path)
    filtered_signal = bandpass_filter(raw_signal)
    normalized_signal = peak_normalize(filtered_signal)

    bpm, bpm_details = estimate_bpm_details(normalized_signal)
    summary = compute_feature_summary(normalized_signal, bpm, bpm_details)
    feature_vector = build_feature_vector_from_summary(summary)

    classifier_bundle = load_classifier()
    model_name = "heuristic_fallback"
    metrics = None

    if classifier_bundle is not None:
        if isinstance(classifier_bundle, dict) and "model" in classifier_bundle:
            classifier = classifier_bundle["model"]
            model_name = classifier_bundle.get("model_name", "trained_model")
            metrics = classifier_bundle.get("test_metrics")
        else:
            classifier = classifier_bundle
            model_name = "trained_random_forest"

        if hasattr(classifier, "predict_proba"):
            class_probabilities = classifier.predict_proba([feature_vector])[0]
            abnormal_index = int(np.where(getattr(classifier, "classes_", np.array([0, 1])) == 1)[0][0])
            abnormal_probability = float(class_probabilities[abnormal_index])
            model_probability = float(np.max(class_probabilities))
        elif hasattr(classifier, "decision_function"):
            decision = classifier.decision_function([feature_vector])
            abnormal_probability = float(1.0 / (1.0 + np.exp(-float(np.max(decision)))))
            model_probability = float(max(abnormal_probability, 1.0 - abnormal_probability))
        else:
            abnormal_probability = 0.5
            model_probability = 0.78

        diagnosis = "Abnormal" if abnormal_probability > ABNORMAL_THRESHOLD else "Normal"
    else:
        diagnosis, model_probability = heuristic_prediction(feature_vector)
        abnormal_probability = model_probability if diagnosis == "Abnormal" else 1.0 - model_probability

    signal_confidence = confidence_score(normalized_signal)
    confidence = round(float(np.clip((model_probability * 0.65) + (signal_confidence * 0.35), 0.4, 0.98)), 2)

    low = float(summary["low_band"])
    mid = float(summary["mid_band"])
    high = float(summary["high_band"])
    snr_proxy = round(float(np.clip((low + mid) / max(high, 0.05), 0.0, 25.0)), 2)
    twin_state = build_twin_state(summary, diagnosis, bpm, confidence, snr_proxy)
    signal_quality = build_signal_quality(snr_proxy, summary)
    severity = build_severity(diagnosis, confidence, twin_state, bpm)
    explainability = build_explainability(summary, twin_state, confidence)

    return {
        "diagnosis": diagnosis,
        "bpm": bpm,
        "confidence": confidence,
        "abnormal_probability": round(float(abnormal_probability), 3),
        "mfcc_fingerprint": [round(float(value), 4) for value in np.asarray(summary["mfcc_mean"]).tolist()],
        "recommendation": build_recommendation(diagnosis, bpm, confidence),
        "sample_rate": TARGET_SAMPLE_RATE,
        "snr": snr_proxy,
        "spectral_centroid": round(float(summary["centroid_mean"]), 2),
        "energy_distribution": {
            "low_band": round(low, 4),
            "mid_band": round(mid, 4),
            "high_band": round(high, 4),
        },
        "severity": severity,
        "signal_quality": signal_quality,
        "explainability": explainability,
        "waveform": summarize_waveform(normalized_signal),
        "twin_state": twin_state,
        "model_source": model_name,
        "model_metrics": metrics,
        "medical_disclaimer": "Research screening output only. Not a clinical diagnosis. Confirm results with validated testing and physician review.",
    }
