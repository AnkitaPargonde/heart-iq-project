import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import InteractiveCard from "../InteractiveCard";
import { springs } from "../../MotionConfig";

function getTooltipStyle(theme) {
  return theme === "dark"
    ? {
        borderRadius: 16,
        border: "1px solid rgba(255, 231, 223, 0.22)",
        background: "rgba(104, 53, 47, 0.96)",
        color: "#fff6f2"
      }
    : {
        borderRadius: 16,
        border: "1px solid rgba(128, 145, 158, 0.2)",
        background: "rgba(255, 255, 255, 0.96)",
        color: "#41241f"
      };
}

export function WaveformCard({ waveform, diagnosis, theme }) {
  const waveformData = waveform.map((value, index) => ({ sample: index, amplitude: value }));

  return (
    <InteractiveCard className="chart-card">
      <div className="panel-heading">
        <div>
          <h2>Filtered Live Waveform</h2>
          <span>Bandpass 25Hz to 400Hz at 2000Hz</span>
        </div>
        <span className="status-chip">{diagnosis}</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={waveformData}>
            <CartesianGrid stroke="rgba(128, 145, 158, 0.16)" vertical={false} />
            <XAxis dataKey="sample" tick={false} axisLine={false} tickLine={false} />
            <YAxis domain={[-1, 1]} tick={false} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ stroke: "rgba(128, 145, 158, 0.18)" }} contentStyle={getTooltipStyle(theme)} />
            <Line
              type="monotone"
              dataKey="amplitude"
              stroke={diagnosis === "Abnormal" ? "#d97706" : "#c2410c"}
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </InteractiveCard>
  );
}

export function EnergyCard({ energyDistribution, theme }) {
  const energyData = [
    { band: "Low", value: Number((energyDistribution.low_band * 100).toFixed(1)) },
    { band: "Mid", value: Number((energyDistribution.mid_band * 100).toFixed(1)) },
    { band: "High", value: Number((energyDistribution.high_band * 100).toFixed(1)) }
  ];

  return (
    <InteractiveCard className="chart-card">
      <div className="panel-heading">
        <div>
          <h2>Energy Distribution</h2>
          <span>Confidence support vector</span>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={energyData}>
            <CartesianGrid stroke="rgba(128, 145, 158, 0.16)" vertical={false} />
            <XAxis dataKey="band" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => [`${value}%`, "Energy"]} contentStyle={getTooltipStyle(theme)} />
            <Bar dataKey="value" fill="#f97316" radius={[14, 14, 6, 6]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </InteractiveCard>
  );
}

export function MFCCTileGrid({ fingerprint }) {
  return (
    <div className="mfcc-grid">
      {fingerprint.map((value, index) => (
        <motion.div
          key={`${index}-${value}`}
          className="mfcc-tile"
          whileHover={{ y: -10, scale: 1.02 }}
          transition={springs.cardHover}
        >
          <span className="mfcc-index">{String(index + 1).padStart(2, "0")}</span>
          <strong>MFCC {index + 1}</strong>
          <div className="mfcc-value">{value.toFixed(2)}</div>
        </motion.div>
      ))}
    </div>
  );
}

export function MFCCRadarCard({ fingerprint, diagnosis, theme }) {
  const radarData = fingerprint.map((value, index) => ({
    coefficient: `C${index + 1}`,
    value: Math.abs(Number(value.toFixed(2)))
  }));

  return (
    <InteractiveCard className="vault-chart">
      <div className="panel-heading">
        <div>
          <h2>MFCC Radar Chart</h2>
          <span>13-coefficient fingerprint</span>
        </div>
        <span className="status-chip">{diagnosis}</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(128, 145, 158, 0.18)" />
            <PolarAngleAxis
              dataKey="coefficient"
              tick={{ fill: theme === "dark" ? "#ffe4db" : "#7a584f", fontSize: 11 }}
            />
            <Radar
              name="MFCC"
              dataKey="value"
              stroke="#ea580c"
              fill="#fb923c"
              fillOpacity={0.24}
            />
            <Legend />
            <Tooltip contentStyle={getTooltipStyle(theme)} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </InteractiveCard>
  );
}
