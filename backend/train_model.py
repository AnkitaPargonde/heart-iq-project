from __future__ import annotations

import csv
import json
import os
from os import getenv
from pathlib import Path
import re

import joblib
import numpy as np
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from analyzer import (
    MODEL_PATH,
    bandpass_filter,
    build_feature_vector_from_summary,
    compute_feature_summary,
    estimate_bpm_details,
    load_audio,
    peak_normalize,
)

try:
    from xgboost import XGBClassifier
except ImportError:  # pragma: no cover - optional dependency
    XGBClassifier = None


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
REPORT_PATH = MODEL_DIR / "model_comparison.json"
DEFAULT_DATASET_DIR = BASE_DIR / "physionet_2016"
FAST_RECOVERY_MODE = getenv("HEART_IQ_FAST_MODEL", "false").strip().lower() not in {"0", "false", "no"}
FORCE_LOGISTIC_MODEL = getenv("HEART_IQ_FORCE_LOGISTIC", "true").strip().lower() not in {"0", "false", "no"}


def resolve_dataset_dir() -> Path:
    raw_override = os.environ.get("HEART_IQ_DATASET_DIR", "").strip()
    if raw_override:
        return Path(raw_override).expanduser().resolve()

    return DEFAULT_DATASET_DIR


def infer_label_from_name(path: Path) -> int | None:
    stem = path.stem.lower()
    if re.search(r"(abnormal|abn|murmur|artifact)", stem):
        return 1
    if re.search(r"(normal|norm)", stem):
        return 0
    return None


def parse_reference_label(raw_label: str) -> int | None:
    value = raw_label.strip().lower()

    if value in {"1", "abnormal"}:
        return 1
    if value in {"-1", "normal"}:
        return 0

    return None


def load_reference_labels(dataset_dir: Path) -> dict[str, int]:
    labels: dict[str, int] = {}

    for reference_path in dataset_dir.rglob("REFERENCE.csv"):
        with reference_path.open("r", encoding="utf-8") as handle:
            reader = csv.reader(handle)
            for row in reader:
                if len(row) < 2:
                    continue

                record_id = row[0].strip()
                label = parse_reference_label(row[1])
                if not record_id or label is None:
                    continue

                labels[record_id] = label

    return labels


def augment_signal(signal: np.ndarray, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    gain = float(rng.uniform(0.92, 1.08))
    noise = rng.normal(0.0, 0.006, size=signal.shape).astype(np.float32)
    shifted = np.roll(signal, int(rng.integers(-12, 13)))
    augmented = peak_normalize((shifted * gain) + noise)
    return augmented.astype(np.float32)


def collect_dataset(dataset_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    features: list[np.ndarray] = []
    labels: list[int] = []
    reference_labels = load_reference_labels(dataset_dir)

    wav_paths = sorted(dataset_dir.rglob("*.wav"))
    for wav_path in wav_paths:
        label = reference_labels.get(wav_path.stem)
        if label is None:
            label = infer_label_from_name(wav_path)
        if label is None:
            continue

        signal = peak_normalize(bandpass_filter(load_audio(wav_path)))
        bpm, bpm_details = estimate_bpm_details(signal)
        features.append(build_feature_vector_from_summary(compute_feature_summary(signal, bpm, bpm_details)))
        labels.append(label)

    if not features:
        raise SystemExit(
            "No labeled WAV files found. Point HEART_IQ_DATASET_DIR to a dataset folder that contains WAV files and labels "
            "(REFERENCE.csv or normal/abnormal names)."
        )

    return np.vstack(features), np.array(labels, dtype=np.int32)


def oversample_minority(x_train: np.ndarray, y_train: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    unique, counts = np.unique(y_train, return_counts=True)
    max_count = int(np.max(counts))
    rng = np.random.default_rng(42)

    resampled_features: list[np.ndarray] = []
    resampled_labels: list[np.ndarray] = []

    for label in unique:
        subset = x_train[y_train == label]
        subset_labels = y_train[y_train == label]
        if subset.shape[0] < max_count:
            extra_indices = rng.choice(subset.shape[0], size=max_count - subset.shape[0], replace=True)
            subset = np.vstack([subset, subset[extra_indices]])
            subset_labels = np.concatenate([subset_labels, subset_labels[extra_indices]])
        resampled_features.append(subset)
        resampled_labels.append(subset_labels)

    x_balanced = np.vstack(resampled_features)
    y_balanced = np.concatenate(resampled_labels)
    shuffle_indices = rng.permutation(y_balanced.shape[0])
    return x_balanced[shuffle_indices], y_balanced[shuffle_indices]


def build_model_configs():
    configs = [
        {
            "name": "logistic_regression",
            "estimator": Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("model", LogisticRegression(max_iter=3000, class_weight="balanced", solver="liblinear")),
                ]
            ),
            "params": {
                "model__C": np.logspace(-2, 1, 6),
            },
        },
        {
            "name": "svm_rbf",
            "estimator": Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("model", SVC(probability=True, class_weight="balanced")),
                ]
            ),
            "params": {
                "model__C": np.logspace(-1, 2, 6),
                "model__gamma": ["scale", 0.01, 0.03, 0.1],
            },
        },
        {
            "name": "random_forest",
            "estimator": RandomForestClassifier(random_state=42, class_weight="balanced_subsample"),
            "params": {
                "n_estimators": [250, 350, 450],
                "max_depth": [12, 16, None],
                "min_samples_leaf": [1, 2, 4],
                "max_features": ["sqrt", 0.45, 0.7],
            },
        },
        {
            "name": "extra_trees",
            "estimator": ExtraTreesClassifier(random_state=42, class_weight="balanced"),
            "params": {
                "n_estimators": [250, 350, 450],
                "max_depth": [12, 16, None],
                "min_samples_leaf": [1, 2, 4],
                "max_features": ["sqrt", 0.45, 0.7],
            },
        },
    ]

    if XGBClassifier is not None:
        configs.append(
            {
                "name": "xgboost",
                "estimator": XGBClassifier(
                    objective="binary:logistic",
                    eval_metric="logloss",
                    random_state=42,
                    n_jobs=4,
                    subsample=0.9,
                    colsample_bytree=0.9,
                ),
                "params": {
                    "n_estimators": [250, 400],
                    "max_depth": [3, 4, 5],
                    "learning_rate": [0.03, 0.05, 0.08],
                    "min_child_weight": [1, 3, 5],
                    "scale_pos_weight": [1.0, 1.6, 2.0],
                },
            }
        )

    if FORCE_LOGISTIC_MODEL:
        return [config for config in configs if config["name"] == "logistic_regression"]

    if FAST_RECOVERY_MODE:
        return [config for config in configs if config["name"] == "extra_trees"]

    return configs


def evaluate_predictions(model, x_test: np.ndarray, y_test: np.ndarray) -> dict[str, float | list[list[int]]]:
    predictions = model.predict(x_test)
    if hasattr(model, "predict_proba"):
        positive_scores = model.predict_proba(x_test)[:, 1]
    elif hasattr(model, "decision_function"):
        decision = model.decision_function(x_test)
        positive_scores = 1.0 / (1.0 + np.exp(-decision))
    else:
        positive_scores = predictions.astype(np.float64)

    tn, fp, fn, tp = confusion_matrix(y_test, predictions, labels=[0, 1]).ravel()
    specificity = float(tn / max(tn + fp, 1))
    sensitivity = float(tp / max(tp + fn, 1))

    return {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_test, predictions)), 4),
        "precision_abnormal": round(float(precision_score(y_test, predictions, pos_label=1, zero_division=0)), 4),
        "recall_abnormal": round(float(recall_score(y_test, predictions, pos_label=1, zero_division=0)), 4),
        "f1_abnormal": round(float(f1_score(y_test, predictions, pos_label=1, zero_division=0)), 4),
        "specificity_normal": round(specificity, 4),
        "roc_auc": round(float(roc_auc_score(y_test, positive_scores)), 4),
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
    }


def selection_score(metrics: dict[str, float | list[list[int]]]) -> float:
    return round(
        (float(metrics["accuracy"]) * 0.35)
        + (float(metrics["specificity_normal"]) * 0.30)
        + (float(metrics["recall_abnormal"]) * 0.20)
        + (float(metrics["balanced_accuracy"]) * 0.15),
        4,
    )


def main() -> None:
    dataset_dir = resolve_dataset_dir()
    if not dataset_dir.exists():
        raise SystemExit(f"Dataset folder not found: {dataset_dir}")

    x, y = collect_dataset(dataset_dir)
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)
    x_balanced, y_balanced = oversample_minority(x_train, y_train)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    model_reports = []
    best_model = None
    best_report = None

    cv_splits = 3 if FAST_RECOVERY_MODE else 5
    for config in build_model_configs():
        search = RandomizedSearchCV(
            estimator=config["estimator"],
            param_distributions=config["params"],
            n_iter=4 if FAST_RECOVERY_MODE else min(8, len(list(config["params"].values())[0]) if config["params"] else 1),
            scoring="balanced_accuracy",
            cv=cv_splits,
            random_state=42,
            n_jobs=-1,
            refit=True,
        )
        search.fit(x_balanced, y_balanced)

        best_estimator = search.best_estimator_
        cv_scores = cross_validate(
            best_estimator,
            x_balanced,
            y_balanced,
            cv=cv,
            scoring={
                "balanced_accuracy": "balanced_accuracy",
                "f1_abnormal": "f1",
                "recall_abnormal": "recall",
                "precision_abnormal": "precision",
            },
            n_jobs=-1,
        )
        test_metrics = evaluate_predictions(best_estimator, x_test, y_test)
        report = {
            "model_name": config["name"],
            "best_params": search.best_params_,
            "cv_balanced_accuracy_mean": round(float(np.mean(cv_scores["test_balanced_accuracy"])), 4),
            "cv_f1_abnormal_mean": round(float(np.mean(cv_scores["test_f1_abnormal"])), 4),
            "cv_recall_abnormal_mean": round(float(np.mean(cv_scores["test_recall_abnormal"])), 4),
            "cv_precision_abnormal_mean": round(float(np.mean(cv_scores["test_precision_abnormal"])), 4),
            "test_metrics": test_metrics,
        }
        report["selection_score"] = selection_score(test_metrics)
        model_reports.append(report)

        if best_report is None or report["selection_score"] > best_report["selection_score"]:
            best_report = report
            best_model = best_estimator

    if best_model is None or best_report is None:
        raise SystemExit("Model selection failed.")

    bundle = {
        "model": best_model,
        "model_name": best_report["model_name"],
        "feature_count": int(x.shape[1]),
        "training_samples": int(x_balanced.shape[0]),
        "dataset_samples": int(x.shape[0]),
        "test_metrics": best_report["test_metrics"],
        "model_reports": model_reports,
    }
    joblib.dump(bundle, MODEL_PATH)
    REPORT_PATH.write_text(json.dumps({"best_model": best_report, "all_models": model_reports}, indent=2), encoding="utf-8")

    print("Best model:", best_report["model_name"])
    print(json.dumps(best_report["test_metrics"], indent=2))
    print(f"Saved model bundle to {MODEL_PATH}")
    print(f"Saved comparison report to {REPORT_PATH}")


if __name__ == "__main__":
    main()
