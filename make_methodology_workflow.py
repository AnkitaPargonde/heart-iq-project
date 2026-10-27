import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from pathlib import Path
from textwrap import fill


OUT_DIR = Path(r"C:\Users\ankita\Documents\New project")


fig, ax = plt.subplots(figsize=(20, 12), dpi=200)
fig.patch.set_facecolor("#fbf4ef")
ax.set_xlim(0, 20)
ax.set_ylim(0, 12)
ax.axis("off")

text = "#4e2a1f"
muted = "#7f5a4c"
edge = "#a86a4b"


def box(x, y, w, h, label, fc, ec=edge, fs=15, color="white", weight="bold", round_size=0.14):
    patch = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle=f"round,pad=0.03,rounding_size={round_size}",
        linewidth=1.8,
        edgecolor=ec,
        facecolor=fc,
    )
    ax.add_patch(patch)
    ax.text(
        x + w / 2,
        y + h / 2,
        fill(label, width=22),
        ha="center",
        va="center",
        fontsize=fs,
        color=color,
        fontweight=weight,
    )
    return patch


def arrow(x1, y1, x2, y2, color=edge, lw=1.6, ms=12):
    arr = FancyArrowPatch(
        (x1, y1),
        (x2, y2),
        arrowstyle="-|>",
        mutation_scale=ms,
        linewidth=lw,
        color=color,
        shrinkA=0,
        shrinkB=0,
    )
    ax.add_patch(arr)


ax.text(
    10,
    11.45,
    "Methodology of Heart-IQ",
    ha="center",
    va="center",
    fontsize=30,
    fontweight="bold",
    color=text,
)
ax.text(
    10,
    11.05,
    "Acoustic heart sound analysis and digital twin visualization pipeline",
    ha="center",
    va="center",
    fontsize=17,
    color=muted,
)

ax.text(1.05, 8.75, "Input", fontsize=14, color=muted)
ax.text(5.45, 9.8, "Preprocessing", fontsize=14, color=muted)
ax.text(9.65, 9.85, "Feature Extraction", fontsize=14, color=muted)
ax.text(14.8, 9.85, "Inference", fontsize=14, color=muted)
ax.text(15.25, 5.9, "Outputs", fontsize=14, color=muted)
ax.text(9.2, 1.85, "Clinical recommendation layer", fontsize=12, color=muted)

box(0.9, 8.05, 3.4, 1.1, "PhysioNet / CinC 2016 PCG Dataset", "#a3563f", fs=16)
box(0.9, 6.45, 3.4, 1.1, "WAV Audio Input", "#b86a4b", fs=16)
box(0.9, 4.85, 3.4, 1.1, "User Symptoms\n& Notes", "#cf7b5d", fs=16)

box(5.05, 8.25, 3.5, 1.0, "Resample to\n2000 Hz", "#f2b26d", color=text, fs=15)
box(5.05, 6.65, 3.5, 1.0, "Butterworth Bandpass Filter\n25 Hz to 400 Hz", "#f19a61", color=text, fs=14)
box(5.05, 5.05, 3.5, 1.0, "Peak Normalization", "#ea7f48", color=text, fs=16)

box(9.35, 8.25, 3.5, 1.0, "13 MFCCs", "#f6d27a", color=text, fs=16)
box(9.35, 6.65, 3.5, 1.0, "BPM Estimation", "#f1c05d", color=text, fs=16)
box(9.35, 5.05, 3.5, 1.0, "Spectral Features\nCentroid, Bandwidth, Rolloff", "#eab24f", color=text, fs=14)
box(9.35, 3.45, 3.5, 1.0, "Energy & Rhythm Features\nRMS, Bands, Entropy, RR", "#e1ab47", color=text, fs=13)

box(13.85, 8.25, 5.05, 1.0, "Machine Learning Classification\n(Logistic Regression, SVM, Random Forest, Extra Trees, XGBoost)", "#9d3b63", fs=13)
box(13.85, 6.65, 5.05, 1.0, "Binary Prediction\nNormal / Abnormal", "#b04364", fs=16)
box(13.85, 5.05, 5.05, 1.0, "Confidence, Severity,\nSignal Quality, Explainability", "#bf5b70", fs=15)

box(5.0, 2.05, 3.2, 0.95, "PDF Report", "#d26e4d", fs=16)
box(8.65, 2.05, 3.3, 0.95, "MongoDB History", "#d26e4d", fs=15)
box(12.35, 2.05, 3.0, 0.95, "JSON Response", "#d26e4d", fs=16)
box(15.8, 2.05, 3.2, 0.95, "3D Digital Twin", "#d26e4d", fs=16)

box(6.55, 0.4, 7.1, 0.9, "Personalized Care Guidance\nRoutine monitoring / Doctor follow-up / Urgent advice", "#9a6a2b", color="white", fs=14)

arrow(2.6, 8.05, 2.6, 7.55)
arrow(2.6, 6.45, 2.6, 5.95)
arrow(4.3, 5.4, 5.05, 5.55)

arrow(6.8, 8.25, 6.8, 7.65)
arrow(6.8, 6.65, 6.8, 6.05)

arrow(11.1, 8.25, 11.1, 7.65)
arrow(11.1, 6.65, 11.1, 6.05)
arrow(11.1, 5.05, 11.1, 4.45)

arrow(12.85, 8.75, 13.85, 8.75)
arrow(12.85, 7.15, 13.85, 7.15)
arrow(12.85, 5.55, 13.85, 6.0)
arrow(12.85, 3.95, 13.85, 5.55)

arrow(16.35, 8.25, 16.35, 7.65)
arrow(16.35, 6.65, 16.35, 6.05)
arrow(16.35, 5.05, 16.35, 3.0)

arrow(6.6, 2.05, 7.35, 1.3)
arrow(10.3, 2.05, 10.1, 1.3)
arrow(13.7, 2.05, 12.9, 1.3)
arrow(17.4, 2.05, 13.5, 1.3)
arrow(8.2, 2.05, 9.8, 1.3)
arrow(10.3, 2.05, 10.8, 1.3)
arrow(13.5, 2.05, 11.7, 1.3)
arrow(17.4, 2.05, 12.6, 1.3)

png_path = OUT_DIR / "methodology_workflow_heart_iq.png"
jpg_path = OUT_DIR / "methodology_workflow_heart_iq.jpg"
fig.savefig(png_path, bbox_inches="tight", facecolor=fig.get_facecolor())
fig.savefig(jpg_path, bbox_inches="tight", facecolor=fig.get_facecolor(), dpi=200)

print(png_path)
print(jpg_path)
