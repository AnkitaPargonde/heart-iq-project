import { cardItem } from "../../MotionConfig";
import InteractiveCard from "../InteractiveCard";

export default function MetricCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <InteractiveCard className="metric-card" variants={cardItem}>
      <div className="metric-icon-row">
        <span className="metric-icon-shell">
          <Icon size={18} />
        </span>
        <div className="metric-accent" style={{ background: accent }} />
      </div>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-detail">{detail}</p>
    </InteractiveCard>
  );
}
