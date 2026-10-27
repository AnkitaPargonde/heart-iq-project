import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, BrainCircuit, Stethoscope, Waves } from "lucide-react";
import InteractiveCard from "../InteractiveCard";
import MetricCard from "./MetricCard";
import { cardStagger, springs } from "../../MotionConfig";
import { analysisStatusCopy, metricAccents } from "../../constants/dashboard";
import { EnergyCard, WaveformCard } from "./AnalysisCards";

export default function OverviewView({
  analysis,
  status,
  defenseMode,
  theme,
  heartActive,
  setHeartActive,
  hasUpload,
  fileName,
  lastSource,
  HeartModel,
  user,
  symptoms,
  setSymptoms,
  history = [],
  modelComparison
}) {
  const statusCopy = analysisStatusCopy[status];
  const [selectedZone, setSelectedZone] = useState("auto");
  const twinState = analysis.twin_state ?? {};
  const severity = analysis.severity ?? { label: "low", score: 0 };
  const signalQuality = analysis.signal_quality ?? { label: "moderate", score: 0 };
  const explainability = analysis.explainability ?? [];
  const validationSummary = modelComparison?.best_model ?? null;
  const backendCareGuidance = analysis.care_guidance ?? {
    priority: "routine",
    message: "Add symptoms before analysis to generate personalized care guidance.",
    actions: ["This prototype is a screening support tool, not a final clinical diagnosis."]
  };
  const activeZone = selectedZone === "auto" ? twinState.acoustic_focus : selectedZone;
  const zoneOptions = ["auto", "aortic", "pulmonic", "tricuspid", "mitral"];
  const symptomOptions = [
    ["chest_pain", "Chest pain"],
    ["shortness_of_breath", "Shortness of breath"],
    ["palpitations", "Palpitations"],
    ["dizziness", "Dizziness"],
    ["fainting", "Fainting"],
    ["fatigue", "Fatigue"],
    ["swelling", "Leg swelling"],
    ["severe_breathlessness", "Severe breathlessness"],
    ["blue_lips", "Blue lips"]
  ];
  const selectedSymptoms = symptomOptions.filter(([key]) => symptoms?.[key]).map(([, label]) => label);
  const hasLiveSymptoms = selectedSymptoms.length > 0 || Boolean(symptoms?.notes?.trim());
  const liveCareGuidance = (() => {
    const urgentSymptoms = ["chest_pain", "fainting", "severe_breathlessness", "blue_lips"];
    const concerningSymptoms = ["shortness_of_breath", "palpitations", "dizziness", "swelling", "fatigue"];
    const activeKeys = symptomOptions.filter(([key]) => symptoms?.[key]).map(([key]) => key);
    const hasUrgent = activeKeys.some((key) => urgentSymptoms.includes(key));
    const hasConcerning = activeKeys.some((key) => concerningSymptoms.includes(key));
    const isSevereReading =
      analysis.diagnosis === "Abnormal" ||
      severity.label === "high" ||
      Number(analysis.bpm) >= 110 ||
      Number(analysis.bpm) <= 48;

    if (hasUrgent) {
      return {
        priority: "urgent",
        message: "Urgent warning signs are selected. Seek emergency medical care or contact a doctor immediately.",
        actions: [
          "Do not rely only on this prototype result.",
          "Visit an emergency department or contact local emergency services.",
          "Carry the report and describe the symptoms clearly."
        ]
      };
    }

    if (isSevereReading || hasConcerning) {
      return {
        priority: "doctor_visit",
        message: "Symptoms suggest you should schedule a doctor or cardiology visit soon, especially if they repeat.",
        actions: [
          "Book a doctor consultation and share the uploaded WAV report.",
          "Repeat the recording in a quieter environment if possible.",
          "Track when symptoms appear, such as rest, walking, or exercise."
        ]
      };
    }

    return {
      priority: "routine",
      message: "Selected symptoms are mild right now, but continue monitoring and seek medical advice if they worsen.",
      actions: [
        "Keep observing symptoms and heart-sound changes.",
        "Repeat a clean recording if you notice new discomfort.",
        "Consult a doctor if symptoms increase in frequency or intensity."
      ]
    };
  })();
  const careGuidance = hasLiveSymptoms ? liveCareGuidance : backendCareGuidance;

  async function downloadReport() {
    const { jsPDF } = await import("jspdf");
    const documentDate = new Date();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 6;
    const sectionGap = 10;
    const labelGap = 7;
    let cursorY = 20;

    function ensureSpace(requiredHeight = 12) {
      if (cursorY + requiredHeight <= pageHeight - margin) {
        return;
      }
      doc.addPage();
      cursorY = 20;
    }

    function writeWrappedText(text, options = {}) {
      const size = options.size ?? 11;
      const color = options.color ?? [55, 33, 25];
      const indent = options.indent ?? 0;
      doc.setFont("helvetica", options.weight ?? "normal");
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text), contentWidth - indent);
      ensureSpace(lines.length * lineHeight + 2);
      doc.text(lines, margin + indent, cursorY);
      cursorY += lines.length * lineHeight + 2;
    }

    function writeSection(title, rows) {
      ensureSpace(20);
      doc.setDrawColor(251, 146, 60);
      doc.setLineWidth(0.6);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(127, 29, 29);
      doc.text(title, margin, cursorY);
      cursorY += 8;

      rows.forEach(([label, value]) => {
        writeWrappedText(`${label}: ${value ?? "-"}`, { size: 11, color: [55, 33, 25] });
      });

      cursorY += sectionGap - 2;
    }

    const selectedSymptomsText = selectedSymptoms.length ? selectedSymptoms.join(", ") : "None reported";
    const careActionsText = (careGuidance.actions ?? []).map((action, index) => `${index + 1}. ${action}`).join("  ");
    const explainabilityText = explainability.length
      ? explainability.map((item) => `${item.feature} (${Math.round(item.impact * 100)}%): ${item.reason}`).join("  ")
      : "No explainability details available";
    const patientHistoryText = history.length
      ? history
          .map(
            (item, index) =>
              `${index + 1}. ${item.created_at || "Unknown date"} - ${item.file_name || "Unknown file"} - ${item.diagnosis || "Unknown"} - ${item.bpm ?? "-"} BPM - ${Math.round((item.confidence ?? 0) * 100)}% confidence`
          )
          .join("  ")
      : "No prior analyses stored for this login.";

    doc.setFillColor(127, 29, 29);
    doc.roundedRect(margin, 12, contentWidth, 24, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 250, 247);
    doc.text("Heart-IQ Acoustic Diagnostic Report", margin + 6, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${documentDate.toLocaleString()}`, margin + 6, 29);
    cursorY = 46;

    writeSection("Patient Profile", [
      ["Name", user?.full_name || "Not provided"],
      ["Mobile", user?.mobile_number || "Not provided"],
      ["Age", user?.age ?? "Not provided"],
      ["Sex", user?.sex ?? "Not specified"],
      ["Known conditions", user?.known_conditions || "None listed"]
    ]);

    writeSection("Recording Summary", [
      ["Uploaded file", fileName || "No uploaded file"],
      ["Capture source", hasUpload ? lastSource : statusCopy.title],
      ["Diagnosis", analysis.diagnosis],
      ["Heart rate", `${analysis.bpm} BPM`],
      ["Confidence", `${Math.round(analysis.confidence * 100)}%`],
      ["Severity", `${severity.label} (${Math.round(severity.score * 100)}%)`],
      ["Signal quality", `${signalQuality.label} (${Math.round(signalQuality.score * 100)}%)`],
      ["Model", analysis.model_source.replaceAll("_", " ")]
    ]);

    writeSection("Symptoms and Notes", [
      ["Reported symptoms", selectedSymptomsText],
      ["Doctor notes", symptoms?.notes?.trim() || "None added"]
    ]);

    writeSection("Clinical Guidance", [
      ["Priority", careGuidance.priority.replaceAll("_", " ")],
      ["Guidance", careGuidance.message],
      ["Recommendation", analysis.recommendation],
      ["Suggested actions", careActionsText]
    ]);

    writeSection("Validation Summary", validationSummary ? [
      ["Selected model", validationSummary.model_name?.replaceAll("_", " ") ?? "Unknown"],
      ["Cross-validation balanced accuracy", `${Math.round((validationSummary.cv_balanced_accuracy_mean ?? 0) * 100)}%`],
      ["Cross-validation F1 (abnormal)", `${Math.round((validationSummary.cv_f1_abnormal_mean ?? 0) * 100)}%`],
      ["Test accuracy", `${Math.round((validationSummary.test_metrics?.accuracy ?? 0) * 100)}%`],
      ["Test recall (abnormal)", `${Math.round((validationSummary.test_metrics?.recall_abnormal ?? 0) * 100)}%`],
      ["ROC-AUC", `${Math.round((validationSummary.test_metrics?.roc_auc ?? 0) * 100)}%`],
      ["Selection score", `${Math.round((validationSummary.selection_score ?? 0) * 100)}%`]
    ] : [
      ["Selected model", "No comparison data loaded"],
      ["Validation summary", "Fetch the model comparison report to include training results."]
    ]);

    writeSection("Digital Twin and Acoustic Findings", [
      ["Acoustic focus", twinState.acoustic_focus ?? "Mitral"],
      ["Rhythm state", twinState.rhythm_state?.replaceAll("_", " ") ?? "Regular"],
      ["Murmur intensity", `${Math.round(Number(twinState.murmur_intensity ?? 0) * 100)}%`],
      ["Turbulence", `${Math.round(Number(twinState.turbulence ?? 0) * 100)}%`],
      ["Explainability", explainabilityText]
    ]);

    writeSection("Patient Upload History", [
      ["Total saved WAV reports", history.length],
      ["All uploads", patientHistoryText]
    ]);

    ensureSpace(22);
    doc.setDrawColor(245, 158, 11);
    doc.setFillColor(255, 247, 237);
    doc.roundedRect(margin, cursorY, contentWidth, 20, 4, 4, "FD");
    cursorY += labelGap;
    writeWrappedText(analysis.medical_disclaimer, { size: 10, color: [120, 53, 15], indent: 3 });

    doc.save(`heart-iq-report-${Date.now()}.pdf`);
  }

  return (
    <motion.div className="dashboard-grid" layout variants={cardStagger} initial="hidden" animate="visible">
      <InteractiveCard className="hero-card" layoutId="hero-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Acoustic Diagnostic Protocol</p>
            <h1>Heart Twin Diagnostic Deck</h1>
          </div>
          <span className="status-pill">{analysis.model_source.replaceAll("_", " ")}</span>
        </div>
        <p className="hero-copy">{statusCopy.body} This is positioned as a screening and decision-support workflow, not a final diagnosis.</p>
        <div className="hero-flags">
          <span>{user ? `Logged in as: ${user.full_name} (${user.mobile_number})` : "Secure session active"}</span>
          <span>{hasUpload ? `Active file: ${fileName}` : "Awaiting WAV upload"}</span>
          <span>{hasUpload ? `Capture source: ${lastSource}` : statusCopy.title}</span>
          <span>{analysis.medical_disclaimer}</span>
        </div>
      </InteractiveCard>

      <InteractiveCard
        className={`heart-panel ${analysis.diagnosis === "Abnormal" ? "heart-panel-alert" : "heart-panel-normal"}`}
        layoutId="heart-panel"
      >
        <div className="panel-heading">
          <div>
            <h2>3D Digital Twin</h2>
            <span>Pulse-locked anatomical visualization</span>
          </div>
          <motion.div
            className={`haptic-indicator ${analysis.diagnosis === "Abnormal" ? "alert" : ""}`}
            animate={heartActive ? { x: [0, -3, 3, -2, 2, 0], scale: [1, 1.04, 1] } : { x: 0, scale: 1 }}
            transition={springs.haptic}
          >
            {analysis.diagnosis}
          </motion.div>
        </div>
        <HeartModel
          bpm={analysis.bpm}
          diagnosis={analysis.diagnosis === "Awaiting Input" ? "Normal" : analysis.diagnosis}
          defenseMode={defenseMode}
          theme={theme}
          active={heartActive}
          onHoverChange={setHeartActive}
          twinState={twinState}
          auscultationSite={activeZone}
        />
        <div className="auscultation-control" aria-label="Auscultation focus selector">
          {zoneOptions.map((zone) => (
            <button
              key={zone}
              type="button"
              className={selectedZone === zone ? "active" : ""}
              onClick={() => setSelectedZone(zone)}
            >
              {zone === "auto" ? "Auto" : zone}
            </button>
          ))}
        </div>
        <p className="panel-note">
          The twin is synchronized to {analysis.bpm} BPM and reflects the current diagnostic state with layered anatomy tones.
        </p>
        <div className={`state-banner ${analysis.diagnosis === "Abnormal" ? "alert" : "normal"}`}>
          {twinState.interpretation ??
            (analysis.diagnosis === "Abnormal"
              ? "Abnormal state: rapid pulse, red shell, and unstable motion"
              : "Normal state: calm pulse, teal shell, and stable motion")}
        </div>
      </InteractiveCard>

      <motion.div className="metrics-grid" variants={cardStagger}>
        <MetricCard
          icon={Activity}
          label="Heart Rate"
          value={`${analysis.bpm} BPM`}
          detail="Derived from the filtered acoustic envelope."
          accent={metricAccents.bpm}
        />
        <MetricCard
          icon={Stethoscope}
          label="Diagnosis"
          value={analysis.diagnosis}
          detail={analysis.recommendation}
          accent={metricAccents.diagnosis}
        />
        <MetricCard
          icon={Waves}
          label="SNR Proxy"
          value={analysis.snr.toFixed(2)}
          detail="Signal cleanliness after field filtering."
          accent={metricAccents.snr}
        />
        <MetricCard
          icon={BrainCircuit}
          label="Confidence"
          value={`${Math.round(analysis.confidence * 100)}%`}
          detail={`Spectral centroid ${analysis.spectral_centroid}Hz`}
          accent={metricAccents.confidence}
        />
      </motion.div>

      <WaveformCard waveform={analysis.waveform} diagnosis={analysis.diagnosis} theme={theme} />
      <EnergyCard energyDistribution={analysis.energy_distribution} theme={theme} />

      <InteractiveCard className="clinical-insight-card">
        <div className="panel-heading">
          <div>
            <h2>Symptoms</h2>
            <span>Personalizes doctor guidance</span>
          </div>
          <span className={`status-chip severity-${careGuidance.priority === "urgent" ? "high" : "low"}`}>
            {selectedSymptoms.length ? `${selectedSymptoms.length} selected` : careGuidance.priority.replaceAll("_", " ")}
          </span>
        </div>
        <div className="symptom-grid">
          {symptomOptions.map(([key, label]) => (
            <label key={key} className={`symptom-chip ${symptoms?.[key] ? "active" : ""}`}>
              <input
                type="checkbox"
                checked={Boolean(symptoms?.[key])}
                onChange={(event) =>
                  setSymptoms((current) => ({
                    ...current,
                    [key]: event.target.checked
                  }))
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="symptom-selection-copy">
          {selectedSymptoms.length
            ? `Selected: ${selectedSymptoms.join(", ")}`
            : "Select symptoms to personalize the recommendation instantly."}
        </p>
        <label className="symptom-notes">
          <span>Notes for doctor</span>
          <textarea
            value={symptoms?.notes ?? ""}
            onChange={(event) => setSymptoms((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Example: symptoms after exercise, medication details, family history"
            rows={3}
          />
        </label>
      </InteractiveCard>

      <InteractiveCard className="recommendation-card">
        <div className="panel-heading">
          <div>
            <h2>Care Guidance</h2>
            <span>Acoustic result plus symptoms</span>
          </div>
        </div>
        <p className="care-message">{careGuidance.message}</p>
        <p className="recommendation-copy">{analysis.recommendation}</p>
        <div className="care-actions">
          {(careGuidance.actions ?? []).map((action) => (
            <span key={action}>{action}</span>
          ))}
        </div>
        <div className="info-strip">
          <span>Sample rate locked to 2000Hz</span>
          <span>4th-order Butterworth 25Hz to 400Hz</span>
          <span>13 MFCC extracted</span>
          <button type="button" className="report-download-button" onClick={downloadReport}>
            Download report
          </button>
        </div>
      </InteractiveCard>

      <InteractiveCard className="clinical-insight-card">
        <div className="panel-heading">
          <div>
            <h2>Acoustic Risk Profile</h2>
            <span>Severity and signal quality</span>
          </div>
          <span className={`status-chip severity-${severity.label}`}>{severity.label} risk</span>
        </div>
        <div className="risk-grid">
          <div>
            <span>Severity score</span>
            <strong>{Math.round(severity.score * 100)}%</strong>
          </div>
          <div>
            <span>Signal quality</span>
            <strong>{signalQuality.label}</strong>
          </div>
          <div>
            <span>Acoustic focus</span>
            <strong>{twinState.acoustic_focus ?? "mitral"}</strong>
          </div>
        </div>
      </InteractiveCard>

      <InteractiveCard className="clinical-insight-card">
        <div className="panel-heading">
          <div>
            <h2>Explainable AI</h2>
            <span>Top acoustic factors</span>
          </div>
        </div>
        <div className="explainability-list">
          {explainability.map((item) => (
            <div key={item.feature} className="explainability-row">
              <div>
                <strong>{item.feature}</strong>
                <span>{item.reason}</span>
              </div>
              <meter min="0" max="1" value={item.impact} />
            </div>
          ))}
        </div>
      </InteractiveCard>

      <InteractiveCard className="validation-card">
        <div className="panel-heading">
          <div>
            <h2>Validation Summary</h2>
            <span>Cross-validation and test set results</span>
          </div>
          <span className="status-chip">{validationSummary?.model_name?.replaceAll("_", " ") ?? "Model report"}</span>
        </div>
        {validationSummary ? (
          <div className="validation-grid">
            <div>
              <span>CV balanced accuracy</span>
              <strong>{Math.round((validationSummary.cv_balanced_accuracy_mean ?? 0) * 100)}%</strong>
            </div>
            <div>
              <span>CV F1 abnormal</span>
              <strong>{Math.round((validationSummary.cv_f1_abnormal_mean ?? 0) * 100)}%</strong>
            </div>
            <div>
              <span>Test accuracy</span>
              <strong>{Math.round((validationSummary.test_metrics?.accuracy ?? 0) * 100)}%</strong>
            </div>
            <div>
              <span>Test ROC-AUC</span>
              <strong>{Math.round((validationSummary.test_metrics?.roc_auc ?? 0) * 100)}%</strong>
            </div>
          </div>
        ) : (
          <p className="panel-note">Load the model comparison report to display validation metrics.</p>
        )}
        <p className="panel-note">
          The selected model is based on stratified validation, held-out testing, and balanced abnormal-class performance.
        </p>
      </InteractiveCard>
    </motion.div>
  );
}
