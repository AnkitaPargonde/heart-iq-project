import { motion } from "framer-motion";
import InteractiveCard from "../InteractiveCard";
import { cardStagger } from "../../MotionConfig";
import { MFCCTileGrid, MFCCRadarCard } from "./AnalysisCards";

export default function VaultView({ analysis, defenseMode, theme, history = [], modelComparison }) {
  const models = modelComparison?.all_models ?? [];

  return (
    <motion.div className="vault-grid" layout variants={cardStagger} initial="hidden" animate="visible">
      <InteractiveCard className="vault-main" layoutId="hero-panel">
        <div className="panel-heading">
          <div>
            <h2>Acoustic Vault</h2>
            <span>Fingerprint decomposition</span>
          </div>
          <span className="status-chip">{defenseMode ? "Defense On" : "Defense Off"}</span>
        </div>
        <p className="panel-note vault-copy">
          This vault stores the compact MFCC signature used by the classifier, exposing the cepstral profile that shaped the current screen result.
        </p>
        <MFCCTileGrid fingerprint={analysis.mfcc_fingerprint} />
      </InteractiveCard>

      <MFCCRadarCard fingerprint={analysis.mfcc_fingerprint} diagnosis={analysis.diagnosis} theme={theme} />

      <InteractiveCard className="vault-main">
        <div className="panel-heading">
          <div>
            <h2>Model Comparison</h2>
            <span>Training evaluation summary</span>
          </div>
          <span className="status-chip">{modelComparison?.best_model?.model_name ?? "No report"}</span>
        </div>
        {modelComparison?.best_model ? (
          <div className="validation-grid vault-validation-grid">
            <div>
              <span>Cross-validation balanced accuracy</span>
              <strong>{Math.round((modelComparison.best_model.cv_balanced_accuracy_mean ?? 0) * 100)}%</strong>
            </div>
            <div>
              <span>Test accuracy</span>
              <strong>{Math.round((modelComparison.best_model.test_metrics?.accuracy ?? 0) * 100)}%</strong>
            </div>
            <div>
              <span>Test recall abnormal</span>
              <strong>{Math.round((modelComparison.best_model.test_metrics?.recall_abnormal ?? 0) * 100)}%</strong>
            </div>
            <div>
              <span>Selection score</span>
              <strong>{Math.round((modelComparison.best_model.selection_score ?? 0) * 100)}%</strong>
            </div>
          </div>
        ) : null}
        <p className="panel-note vault-copy">
          The final model was chosen by comparing stratified cross-validation and held-out test performance across several classifiers.
        </p>
        <div className="model-table">
          <div className="model-table-head">
            <span>Model</span>
            <span>Accuracy</span>
            <span>Recall</span>
            <span>ROC-AUC</span>
          </div>
          {models.slice(0, 5).map((model) => (
            <div key={model.model_name} className="model-table-row">
              <span>{model.model_name.replaceAll("_", " ")}</span>
              <span>{Math.round((model.test_metrics?.accuracy ?? 0) * 100)}%</span>
              <span>{Math.round((model.test_metrics?.recall_abnormal ?? 0) * 100)}%</span>
              <span>{Math.round((model.test_metrics?.roc_auc ?? 0) * 100)}%</span>
            </div>
          ))}
        </div>
      </InteractiveCard>

      <InteractiveCard className="vault-chart">
        <div className="panel-heading">
          <div>
            <h2>Analysis History</h2>
            <span>MongoDB clinical log</span>
          </div>
          <span className="status-chip">{history.length} records</span>
        </div>
        <div className="history-list">
          {history.length ? (
            history.map((item) => (
              <div key={item._id} className="history-row">
                <div>
                  <strong>{item.diagnosis}</strong>
                  <span>{item.file_name}</span>
                </div>
                <div>
                  <span>{item.bpm} BPM</span>
                  <span>{Math.round((item.confidence ?? 0) * 100)}%</span>
                </div>
              </div>
            ))
          ) : (
            <p className="panel-note">No saved analyses found yet.</p>
          )}
        </div>
      </InteractiveCard>
    </motion.div>
  );
}
