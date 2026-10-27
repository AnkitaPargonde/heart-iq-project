function deriveAnalyzeUrl() {
  return import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/analyze";
}

function deriveHealthUrl() {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base) {
    return `${base.replace(/\/$/, "")}/health`;
  }

  const analyzeUrl = deriveAnalyzeUrl();
  return analyzeUrl.endsWith("/analyze")
    ? `${analyzeUrl.slice(0, -"analyze".length)}health`
    : "http://127.0.0.1:8000/health";
}

function deriveApiUrl(path) {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base) {
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }

  const analyzeUrl = deriveAnalyzeUrl();
  return analyzeUrl.endsWith("/analyze")
    ? `${analyzeUrl.slice(0, -"analyze".length)}${path.replace(/^\//, "")}`
    : `http://127.0.0.1:8000/${path.replace(/^\//, "")}`;
}

export async function analyzeAudioFile(file, clinicalContext = {}, authToken = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("clinical_context", JSON.stringify(clinicalContext));

  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const response = await fetch(deriveAnalyzeUrl(), {
    method: "POST",
    headers,
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail ?? "Upload failed.");
  }

  return payload;
}

export async function getBackendHealth() {
  const response = await fetch(deriveHealthUrl());
  if (!response.ok) {
    throw new Error("Backend health check failed.");
  }

  return response.json();
}

export async function getAnalysisHistory(authToken = "") {
  const historyUrl = new URL(deriveApiUrl("/history"));

  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const response = await fetch(historyUrl, { headers });
  if (!response.ok) {
    throw new Error("Analysis history is unavailable.");
  }

  return response.json();
}

export async function getModelComparison() {
  const response = await fetch(deriveApiUrl("/model-comparison"));
  if (!response.ok) {
    throw new Error("Model comparison report is unavailable.");
  }

  return response.json();
}
