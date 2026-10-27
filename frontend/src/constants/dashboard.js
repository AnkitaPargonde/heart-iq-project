export const sidebarItems = [
  { id: "overview", label: "Overview", icon: "OV" },
  { id: "vault", label: "Acoustic Vault", icon: "AV" },
  { id: "defense", label: "Defense Mode", icon: "DF" }
];

export const emptyPreviewAnalysis = {
  diagnosis: "Awaiting Input",
  bpm: 72,
  confidence: 0.0,
  mfcc_fingerprint: [-132.4, 37.1, 18.4, 14.8, 8.7, 5.3, 2.4, -1.9, -6.3, -10.8, -13.7, -15.1, -16.9],
  recommendation: "Upload a phonocardiogram or record a new heart sound to begin analysis.",
  snr: 0,
  spectral_centroid: 0,
  energy_distribution: {
    low_band: 0.42,
    mid_band: 0.35,
    high_band: 0.23
  },
  severity: {
    score: 0,
    label: "low"
  },
  signal_quality: {
    score: 0.72,
    label: "moderate",
    snr_proxy: 0,
    flatness: 0
  },
  explainability: [
    {
      feature: "Awaiting acoustic features",
      impact: 0,
      reason: "Upload a WAV file to calculate model confidence, rhythm variability, and murmur energy."
    }
  ],
  clinical_context: {
    symptoms: [],
    notes: ""
  },
  care_guidance: {
    priority: "routine",
    message: "Add symptoms before analysis to generate personalized care guidance.",
    actions: ["This prototype is a screening support tool, not a final clinical diagnosis."]
  },
  twin_state: {
    rhythm_state: "regular",
    murmur_intensity: 0,
    turbulence: 0,
    signal_quality: 0.72,
    acoustic_focus: "mitral",
    s1_phase: 0.08,
    s2_phase: 0.3,
    rr_variability: 0,
    interpretation: "Standby acoustic twin state."
  },
  waveform: Array.from({ length: 180 }, (_, index) => Math.sin(index / 9) * 0.42),
  medical_disclaimer:
    "Research screening output only. Not a clinical diagnosis. Confirm results with validated testing and physician review.",
  model_source: "standby_mode"
};

export const analysisStatusCopy = {
  idle: {
    title: "Awaiting WAV input",
    body: "Upload a phonocardiogram or capture a live recording to generate a diagnostic screen."
  },
  loading: {
    title: "Analyzing acoustic signal",
    body: "Resampling, filtering, extracting MFCC fingerprints, and evaluating the diagnostic model."
  },
  success: {
    title: "Analysis complete",
    body: "Review the diagnostic summary, energy balance, and MFCC fingerprint below."
  },
  error: {
    title: "Analysis needs attention",
    body: "The latest request did not complete. Retry the last file or check backend connectivity."
  }
};

export const metricAccents = {
  bpm: "linear-gradient(135deg, rgba(249, 115, 22, 0.4), rgba(251, 146, 60, 0.14))",
  diagnosis: "linear-gradient(135deg, rgba(245, 158, 11, 0.34), rgba(249, 115, 22, 0.08))",
  snr: "linear-gradient(135deg, rgba(239, 68, 68, 0.32), rgba(251, 146, 60, 0.1))",
  confidence: "linear-gradient(135deg, rgba(220, 38, 38, 0.24), rgba(251, 146, 60, 0.1))"
};
