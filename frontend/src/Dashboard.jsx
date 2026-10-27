import { Suspense, lazy, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { Mic, Square, Upload } from "lucide-react";
import InteractiveCard from "./components/InteractiveCard";
import NavigationButton from "./components/dashboard/NavigationButton";
import OverviewView from "./components/dashboard/OverviewView";
import SettingsMenu from "./components/dashboard/SettingsMenu";
import StatusBanner from "./components/dashboard/StatusBanner";
import ErrorBanner from "./components/dashboard/ErrorBanner";
import VaultView from "./components/dashboard/VaultView";
import { sidebarItems } from "./constants/dashboard";
import { springs } from "./MotionConfig";
import { useThemePreference } from "./hooks/useThemePreference";
import { useAnalysis } from "./hooks/useAnalysis";
import { useAudioRecorder } from "./hooks/useAudioRecorder";

const HeartScene = lazy(() => import("./components/HeartScene"));

function DefenseLoader() {
  return (
    <span className="defense-loader" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

const auscultationZones = [
  { id: "aortic", label: "Aortic", x: "62%", y: "27%" },
  { id: "pulmonic", label: "Pulmonic", x: "39%", y: "31%" },
  { id: "tricuspid", label: "Tricuspid", x: "46%", y: "58%" },
  { id: "mitral", label: "Mitral", x: "64%", y: "66%" }
];

function resolveTwinTone(visualState) {
  if (visualState === "alert") {
    return {
      label: "Abnormal",
      accent: "#ef4444",
      shell: "#fb7185",
      glow: "#7f1d1d",
      halo: "rgba(239, 68, 68, 0.28)"
    };
  }

  if (visualState === "caution") {
    return {
      label: "Caution",
      accent: "#f59e0b",
      shell: "#fbbf24",
      glow: "#b45309",
      halo: "rgba(245, 158, 11, 0.24)"
    };
  }

  return {
    label: "Normal",
    accent: "#14b8a6",
    shell: "#2dd4bf",
    glow: "#0f766e",
    halo: "rgba(20, 184, 166, 0.22)"
  };
}

const initialSymptomState = {
  chest_pain: false,
  shortness_of_breath: false,
  palpitations: false,
  dizziness: false,
  fainting: false,
  fatigue: false,
  swelling: false,
  severe_breathlessness: false,
  blue_lips: false,
  notes: ""
};

function HeartModel({ bpm, diagnosis, defenseMode, theme, active, onHoverChange, twinState, auscultationSite }) {
  const focusZone = auscultationSite ?? twinState?.acoustic_focus ?? "mitral";
  const murmurIntensity = Number(twinState?.murmur_intensity ?? 0);
  const turbulence = Number(twinState?.turbulence ?? 0);
  const signalQuality = Number(twinState?.signal_quality ?? 1);
  const rhythmState = twinState?.rhythm_state ?? "regular";
  const visualState = twinState?.visual_state ?? (diagnosis === "Abnormal" ? "alert" : "normal");
  const confidence = Number(twinState?.confidence ?? 0);
  const pulseVariation = Number(twinState?.pulse_variation ?? 0.04);
  const glowStrength = Number(twinState?.glow_strength ?? 0.42);
  const twinTone = resolveTwinTone(visualState);

  return (
    <motion.div
      className={`heart-model-shell rhythm-${rhythmState} twin-${visualState}`}
      animate={{ rotateX: active ? -6 : -2, rotateY: active ? 10 : 3 }}
      transition={springs.layout}
      style={{
        "--twin-accent": twinTone.accent,
        "--twin-shell": twinTone.shell,
        "--twin-glow": twinTone.glow,
        "--twin-halo": twinTone.halo,
        "--murmur-strength": murmurIntensity,
        "--turbulence-strength": turbulence,
        "--signal-quality": signalQuality,
        "--glow-strength": glowStrength,
        "--pulse-variation": pulseVariation
      }}
    >
      <motion.div
        className={`heart-ambient-ring ${visualState}`}
        animate={{
          scale:
            visualState === "alert"
              ? [1, 1.2, 1.05, 1]
              : visualState === "caution"
                ? [1, 1.12, 1.03, 1]
                : [1, 1.08, 1.02, 1],
          opacity: active
            ? visualState === "alert"
              ? [0.42, 0.92, 0.56, 0.42]
              : visualState === "caution"
                ? [0.28, 0.72, 0.4, 0.28]
                : [0.22, 0.56, 0.3, 0.22]
            : visualState === "alert"
              ? [0.24, 0.58, 0.32, 0.24]
              : visualState === "caution"
                ? [0.16, 0.34, 0.2, 0.16]
                : [0.12, 0.28, 0.16, 0.12]
        }}
        transition={{
          duration: Math.max(0.5, 60 / Math.max(bpm, 45)),
          repeat: Infinity,
          ease: [0.22, 0.61, 0.36, 1]
        }}
      />
      <motion.div className={`heart-3d ${active ? "active" : ""}`}>
        <Suspense fallback={<div className="heart-loading-state">Rendering twin...</div>}>
          <HeartScene
            bpm={bpm}
            diagnosis={diagnosis}
            defenseMode={defenseMode}
            theme={theme}
            active={active}
            onHoverChange={onHoverChange}
            twinState={twinState}
          />
        </Suspense>
        <div className="acoustic-heatmap" aria-hidden="true" />
        <div className="signal-quality-veil" aria-hidden="true" />
        <div className="zone-marker-layer" aria-label="Acoustic auscultation zones">
          {auscultationZones.map((zone) => (
            <span
              key={zone.id}
              className={`zone-marker ${zone.id === focusZone ? "active" : ""}`}
              style={{ left: zone.x, top: zone.y }}
              title={`${zone.label} acoustic zone`}
            >
              {zone.label.slice(0, 1)}
            </span>
          ))}
        </div>
      </motion.div>
      <div className="twin-mini-readout">
        <span>{twinTone.label}</span>
        <span>{rhythmState.replaceAll("_", " ")}</span>
        <span>{Math.round(murmurIntensity * 100)}% murmur energy</span>
        <span>{Math.round(signalQuality * 100)}% signal quality</span>
        <span>{focusZone} focus</span>
        <span>{Math.round(confidence * 100)}% confidence</span>
      </div>
      <div className="heartbeat-strip" aria-label="S1 and S2 timing strip">
        <span className="heartbeat-strip-label">S1</span>
        <span className="heartbeat-strip-track">
          <span
            className="heartbeat-strip-marker s1"
            style={{ left: `${Math.round((twinState?.s1_phase ?? 0.08) * 100)}%` }}
          />
          <span
            className="heartbeat-strip-marker s2"
            style={{ left: `${Math.round((twinState?.s2_phase ?? 0.3) * 100)}%` }}
          />
        </span>
        <span className="heartbeat-strip-label">S2</span>
      </div>
      {defenseMode ? <div className="field-overlay">Field Filtering Active</div> : null}
    </motion.div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const uploadInputId = useId();
  const { theme, toggleTheme } = useThemePreference();
  const {
    displayAnalysis,
    fileName,
    status,
    error,
    backendStatus,
    history,
    modelComparison,
    lastSource,
    analyzeFile,
    retryLastAnalysis,
    clearError,
    reportError
  } = useAnalysis(user);
  const [activeView, setActiveView] = useState("overview");
  const [heartActive, setHeartActive] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [defenseMode, setDefenseMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [symptoms, setSymptoms] = useState(initialSymptomState);
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);

  const clinicalContext = useMemo(
    () => ({
      patient: {
        full_name: user?.full_name,
        mobile_number: user?.mobile_number,
        age: user?.age,
        sex: user?.sex,
        known_conditions: user?.known_conditions
      },
      symptoms: Object.entries(symptoms)
        .filter(([key, value]) => key !== "notes" && value)
        .map(([key]) => key),
      notes: symptoms.notes
    }),
    [symptoms, user]
  );

  const { isRecording, toggleRecording } = useAudioRecorder({
    onAudioReady: async (file) => analyzeFile(file, "recording", clinicalContext),
    onError: reportError
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [settingsOpen]);

  const sidebarState = useMemo(
    () => ({
      protocol:
        status === "loading" ? "Analyzing Signal" : status === "success" ? "Wave Indexed" : "Idle Acquisition",
      defense: defenseMode ? "Field Filtering Enabled" : "Field Filtering Ready"
    }),
    [defenseMode, status]
  );

  const isAnalyzing = status === "loading";
  const hasUpload = status === "success";

  return (
    <MotionConfig transition={springs.layout}>
      <div className="dashboard-root">
        <AnimatePresence>
          {showIntro ? (
            <motion.section
              key="intro"
              className="intro-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="intro-card"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.98 }}
                transition={springs.entrance}
              >
                <p className="eyebrow">Initializing Acoustic Diagnostic Protocols...</p>
                <h1>Heart Phonocardiography Twin</h1>
                <p className="hero-copy intro-copy">
                  Loading preprocessing, cepstral fingerprinting, defense overlays, and the live digital heart twin.
                </p>
              </motion.div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <div className="dashboard-shell">
          <motion.aside
            className="sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springs.entrance}
          >
            <div className="sidebar-brand">
              <span className="brand-mark">HI</span>
              <div>
                <strong>HEART-IQ</strong>
                <span>Acoustic Diagnostic Deck</span>
              </div>
            </div>

            <nav className="sidebar-nav">
              {sidebarItems.map((item) => (
                <NavigationButton
                  key={item.id}
                  item={item}
                  active={
                    (item.id === "overview" && activeView === "overview") ||
                    (item.id === "vault" && activeView === "vault") ||
                    (item.id === "defense" && defenseMode)
                  }
                  onClick={() => {
                    if (item.id === "defense") {
                      setDefenseMode((current) => !current);
                      return;
                    }
                    setActiveView(item.id);
                  }}
                />
              ))}
            </nav>

            <InteractiveCard className="sidebar-card" glow={false}>
              <p className="metric-label">Protocol State</p>
              <p className="metric-value">{sidebarState.protocol}</p>
              <p className="metric-detail">{isRecording ? "Microphone capture running" : sidebarState.defense}</p>
            </InteractiveCard>
          </motion.aside>

          <div className="dashboard-main">
            <input
              id={uploadInputId}
              ref={fileInputRef}
              type="file"
              accept=".wav,audio/wav"
              className="file-input-hidden"
              onChange={async (event) => {
                const selectedFile = event.target.files?.[0];
                if (!selectedFile) {
                  return;
                }
                await analyzeFile(selectedFile, "upload", clinicalContext);
              }}
            />

            <StatusBanner status={status} backendStatus={backendStatus} lastSource={lastSource} onRetry={retryLastAnalysis} />

            <div className="topbar">
              <div className="tabs" role="tablist" aria-label="Dashboard views">
                {["overview", "vault"].map((view) => (
                  <motion.button
                    key={view}
                    type="button"
                    role="tab"
                    aria-selected={activeView === view}
                    className={`tab-button ${activeView === view ? "active" : ""}`}
                    onClick={() => setActiveView(view)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {view === "overview" ? "Overview" : "Acoustic Vault"}
                    {activeView === view ? <motion.span layoutId="tab-indicator" className="tab-indicator" /> : null}
                  </motion.button>
                ))}
              </div>

              <div className="topbar-actions">
                <SettingsMenu
                  settingsRef={settingsRef}
                  theme={theme}
                  settingsOpen={settingsOpen}
                  setSettingsOpen={setSettingsOpen}
                  onThemeToggle={toggleTheme}
                  onRestart={() => window.location.reload()}
                  onRecordToggle={toggleRecording}
                  isRecording={isRecording}
                  user={user}
                  onLogout={onLogout}
                />

                <motion.button
                  type="button"
                  className={`record-button ${isRecording ? "recording" : ""}`}
                  onClick={toggleRecording}
                  whileTap={{ scale: 0.98 }}
                  aria-label={isRecording ? "Stop recording" : "Record heart sound"}
                >
                  {isRecording ? <Square size={18} /> : <Mic size={18} />}
                  <span>{isRecording ? "Stop Recording" : "Record"}</span>
                </motion.button>

                <motion.button
                  type="button"
                  className={`upload-button ${isAnalyzing ? "active" : ""} ${isAnalyzing ? "disabled" : ""}`}
                  whileTap={{ scale: isAnalyzing ? 1 : 0.98 }}
                  disabled={isAnalyzing}
                  onClick={() => {
                    setSettingsOpen(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                      fileInputRef.current.click();
                    }
                  }}
                  aria-label="Upload WAV file"
                >
                  {isAnalyzing ? <DefenseLoader /> : <Upload size={18} />}
                  <span>{isAnalyzing ? "Analyzing..." : hasUpload ? "Re-upload .wav" : "Upload .wav"}</span>
                </motion.button>

              </div>
            </div>

            <ErrorBanner message={error} onDismiss={clearError} onRetry={retryLastAnalysis} />

            <LayoutGroup>
              <AnimatePresence mode="wait">
                {activeView === "overview" ? (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={springs.layout}
                  >
                    <OverviewView
                      analysis={displayAnalysis}
                      status={status}
                      defenseMode={defenseMode}
                      theme={theme}
                      heartActive={heartActive}
                      setHeartActive={setHeartActive}
                      hasUpload={hasUpload}
                      fileName={fileName}
                      lastSource={lastSource}
                      HeartModel={HeartModel}
                      user={user}
                      symptoms={symptoms}
                      setSymptoms={setSymptoms}
                      history={history}
                      modelComparison={modelComparison}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="vault"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={springs.layout}
                  >
                    <VaultView
                      analysis={displayAnalysis}
                      defenseMode={defenseMode}
                      theme={theme}
                      history={history}
                      modelComparison={modelComparison}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
