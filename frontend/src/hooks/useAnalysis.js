import { useEffect, useMemo, useRef, useState } from "react";
import { emptyPreviewAnalysis } from "../constants/dashboard";
import { analyzeAudioFile, getAnalysisHistory, getBackendHealth, getModelComparison } from "../services/analysis";

export function useAnalysis(user) {
  const [analysis, setAnalysis] = useState(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [lastSource, setLastSource] = useState("upload");
  const [history, setHistory] = useState([]);
  const [modelComparison, setModelComparison] = useState(null);
  const lastFileRef = useRef(null);
  const lastClinicalContextRef = useRef({});
  const authToken = user?.session_token ?? "";

  async function refreshMetadata() {
    try {
      const [historyPayload, modelPayload] = await Promise.all([
        getAnalysisHistory(authToken),
        getModelComparison()
      ]);
      setHistory(historyPayload.items ?? []);
      setModelComparison(modelPayload);
    } catch {
      // Metadata is helpful, but analysis should continue when MongoDB/report data is unavailable.
    }
  }

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        const payload = await getBackendHealth();
        if (!mounted) {
          return;
        }

        setBackendStatus(payload.mongodb === "connected" ? "mongodb_ready" : "backend_ready");
      } catch {
        if (mounted) {
          setBackendStatus("offline");
        }
      }
    }

    checkHealth();
    refreshMetadata();
    const interval = window.setInterval(checkHealth, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [authToken]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError("");
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [error]);

  async function analyzeFile(file, source = "upload", clinicalContext = {}) {
    setFileName(file.name);
    setStatus("loading");
    setError("");
    setLastSource(source);
    lastFileRef.current = file;
    lastClinicalContextRef.current = clinicalContext;

    try {
      const payload = await analyzeAudioFile(file, clinicalContext, authToken);
      setAnalysis(payload);
      setStatus("success");
      setError("");
      setBackendStatus(payload.storage?.mongodb_enabled ? "mongodb_ready" : "backend_ready");
      refreshMetadata();
    } catch (requestError) {
      setStatus("error");
      setError(requestError.message);
    }
  }

  async function retryLastAnalysis() {
    if (lastFileRef.current) {
      await analyzeFile(lastFileRef.current, lastSource, lastClinicalContextRef.current);
    }
  }

  function reportError(message) {
    setError(message);
    setStatus((current) => (current === "success" ? current : "error"));
  }

  const displayAnalysis = useMemo(() => analysis ?? emptyPreviewAnalysis, [analysis]);

  return {
    analysis,
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
    clearError: () => setError(""),
    reportError
  };
}
