from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from analyzer import analyze_wav_file
from train_model import collect_dataset


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Heart-IQ model on a separate WAV folder for external confirmation."
    )
    parser.add_argument(
        "--dataset-dir",
        required=True,
        help="Path to a folder containing WAV files. Labels are optional but recommended.",
    )
    parser.add_argument(
        "--output",
        default="external_validation_report.json",
        help="Path to save the summary JSON report.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of WAV files to evaluate from the external folder.",
    )
    return parser.parse_args()


def summarize_predictions(dataset_dir: Path, limit: int = 10) -> dict:
    wav_paths = sorted(dataset_dir.rglob("*.wav"))[: max(limit, 1)]
    if not wav_paths:
        raise SystemExit(f"No WAV files found in {dataset_dir}")

    predictions = []
    for wav_path in wav_paths:
        result = analyze_wav_file(wav_path)
        predictions.append(
            {
                "file": wav_path.name,
                "path": str(wav_path),
                "diagnosis": result["diagnosis"],
                "bpm": result["bpm"],
                "confidence": result["confidence"],
                "recommendation": result["recommendation"],
            }
        )

    diagnosis_counts = Counter(item["diagnosis"] for item in predictions)

    summary = {
        "dataset_dir": str(dataset_dir),
        "wav_count": len(wav_paths),
        "diagnosis_counts": dict(diagnosis_counts),
        "predictions": predictions[:25],
        "note": "This is an external confirmation run on non-PhysioNet WAV files.",
    }

    try:
        x, y = collect_dataset(dataset_dir)
        summary["labeled_sample_count"] = int(len(y))
        summary["feature_count"] = int(x.shape[1])
        summary["labels_available"] = True
    except BaseException:
        summary["labels_available"] = False

    return summary


def main() -> None:
    args = parse_args()
    dataset_dir = Path(args.dataset_dir).expanduser().resolve()
    if not dataset_dir.exists():
        raise SystemExit(f"Dataset folder not found: {dataset_dir}")

    summary = summarize_predictions(dataset_dir, args.limit)
    output_path = Path(args.output).expanduser().resolve()
    output_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(json.dumps(summary, indent=2))
    print(f"Saved external confirmation report to {output_path}")


if __name__ == "__main__":
    main()
