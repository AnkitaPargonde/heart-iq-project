import { motion } from "framer-motion";

export default function StatusBanner({ status, backendStatus, lastSource, onRetry }) {
  const backendLabel = {
    checking: "Checking backend",
    backend_ready: "Backend ready",
    mongodb_ready: "MongoDB connected",
    offline: "Backend offline"
  }[backendStatus] ?? "Unknown";

  return (
    <motion.section
      className="status-banner"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <strong>{backendLabel}</strong>
        <span>
          {status === "success"
            ? `Last source: ${lastSource}`
            : "The dashboard is standing by for the next diagnostic cycle."}
        </span>
      </div>
      {status === "error" ? (
        <button type="button" className="status-banner-button" onClick={onRetry}>
          Retry Last Analysis
        </button>
      ) : null}
    </motion.section>
  );
}
