from __future__ import annotations

import json
import sys
import time
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from analyzer import MODEL_PATH  # noqa: E402
from main import app  # noqa: E402


def main() -> None:
    dataset_dir = BACKEND_DIR / "physionet_2016"
    wav_count = len(list(dataset_dir.rglob("*.wav")))
    reference_count = len(list(dataset_dir.rglob("REFERENCE.csv")))

    import joblib

    bundle = joblib.load(MODEL_PATH)
    model_name = bundle.get("model_name") if isinstance(bundle, dict) else type(bundle).__name__
    test_metrics = bundle.get("test_metrics") if isinstance(bundle, dict) else {}

    print(json.dumps(
        {
            "dataset": {
                "wav_count": wav_count,
                "reference_count": reference_count,
            },
            "model": {
                "name": model_name,
                "roc_auc": test_metrics.get("roc_auc"),
                "accuracy": test_metrics.get("accuracy"),
            },
        },
        indent=2,
    ))

    client = TestClient(app)

    mobile_number = str(8800000000 + int(time.time()) % 1000000000)[-10:]
    dob = "2001-02-03"
    payload = {
        "full_name": f"Audit {mobile_number[-4:]}",
        "mobile_number": mobile_number,
        "dob": dob,
        "age": 24,
        "sex": "female",
        "known_conditions": "none",
    }

    register = client.post("/auth/register", json=payload)
    if register.status_code == 409:
        login = client.post("/auth/login", json={"mobile_number": mobile_number, "dob": dob})
        auth = login.json()
    else:
        register.raise_for_status()
        auth = register.json()

    token = auth.get("session_token")
    if not token:
        raise SystemExit("No session token returned from auth flow.")

    headers = {"Authorization": f"Bearer {token}"}
    me = client.get("/auth/me", headers=headers)
    me.raise_for_status()

    sample = dataset_dir / "training-a" / "a0001.wav"
    if not sample.exists():
        raise SystemExit(f"Missing sample WAV: {sample}")

    clinical_context = {
        "patient": {
            "full_name": payload["full_name"],
            "mobile_number": mobile_number,
            "age": payload["age"],
            "sex": payload["sex"],
            "known_conditions": payload["known_conditions"],
        },
        "symptoms": ["palpitations"],
        "notes": "audit run",
    }

    results = []
    for _ in range(2):
        with sample.open("rb") as handle:
            response = client.post(
                "/analyze",
                headers=headers,
                files={"file": (sample.name, handle, "audio/wav")},
                data={"clinical_context": json.dumps(clinical_context)},
            )
        response.raise_for_status()
        payload = response.json()
        twin_state = payload.get("twin_state", {})
        if twin_state.get("visual_state") not in {"normal", "caution", "alert"}:
            raise SystemExit("Unexpected twin visual state.")
        results.append(
            {
                "file": payload.get("file_name"),
                "diagnosis": payload.get("diagnosis"),
                "bpm": payload.get("bpm"),
                "visual_state": twin_state.get("visual_state"),
                "confidence": payload.get("confidence"),
            }
        )

    no_auth_history = client.get("/history")
    if no_auth_history.status_code != 401:
        raise SystemExit("History endpoint should require authentication.")

    history = client.get("/history", headers=headers)
    history.raise_for_status()
    history_items = history.json().get("items", [])
    if len(history_items) < 2:
        raise SystemExit(f"Expected at least 2 history records, found {len(history_items)}")

    print(json.dumps(
        {
            "auth": {
                "mobile_number": me.json()["user"]["mobile_number"],
                "session_expires_at": me.json()["session_expires_at"],
            },
            "analysis_runs": results,
            "history_count": len(history_items),
            "history_files": [item.get("file_name") for item in history_items[:5]],
        },
        indent=2,
    ))


if __name__ == "__main__":
    main()
