import { useEffect, useRef, useState } from "react";
import { recordedBlobToWavFile } from "../utils/audio";

export function useAudioRecorder({ onAudioReady, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);

  const stopRecordingTracks = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  useEffect(() => () => stopRecordingTracks(), []);

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];

      const preferredMimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });
        stopRecordingTracks();

        try {
          const wavFile = await recordedBlobToWavFile(blob);
          await onAudioReady(wavFile);
        } catch {
          onError("Recording completed, but conversion to WAV failed in this browser.");
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      stopRecordingTracks();
      onError("Microphone access was blocked or unavailable.");
    }
  }

  return {
    isRecording,
    toggleRecording
  };
}
