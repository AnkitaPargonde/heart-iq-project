from pathlib import Path
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import auc, roc_curve
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
DATASET_DIR = BACKEND_DIR / "physionet_2016"
OUT_PNG = BASE_DIR / "roc_curve_logistic_regression_heart_iq.png"
OUT_JPG = BASE_DIR / "roc_curve_logistic_regression_heart_iq.jpg"

sys.path.insert(0, str(BACKEND_DIR))

import train_model
from analyzer import MODEL_PATH
import joblib


def main() -> None:
    X, y = train_model.collect_dataset(DATASET_DIR)
    x_train, x_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"] if isinstance(bundle, dict) and "model" in bundle else bundle

    if hasattr(model, "predict_proba"):
        y_score = model.predict_proba(x_test)[:, 1]
    elif hasattr(model, "decision_function"):
        decision = model.decision_function(x_test)
        y_score = 1.0 / (1.0 + np.exp(-decision))
    else:
        y_score = model.predict(x_test).astype(float)

    fpr, tpr, _ = roc_curve(y_test, y_score)
    roc_auc = auc(fpr, tpr)

    plt.figure(figsize=(8.8, 7.2), dpi=220)
    plt.plot(fpr, tpr, color="#b91c1c", linewidth=3.2, label=f"Logistic Regression (AUC = {roc_auc:.4f})")
    plt.plot([0, 1], [0, 1], linestyle="--", color="#6b7280", linewidth=2)
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.02])
    plt.xlabel("False Positive Rate", fontsize=13)
    plt.ylabel("True Positive Rate", fontsize=13)
    plt.title("ROC Curve for Logistic Regression", fontsize=16, fontweight="bold")
    plt.legend(loc="lower right", frameon=False)
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(OUT_PNG, bbox_inches="tight")
    plt.savefig(OUT_JPG, bbox_inches="tight")
    plt.close()
    print(OUT_PNG)
    print(OUT_JPG)


if __name__ == "__main__":
    main()
