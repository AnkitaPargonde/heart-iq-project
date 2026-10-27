from datetime import datetime
from pathlib import Path
import json
from typing import Optional

from pydantic import BaseModel
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from analyzer import AnalysisError, analyze_wav_file
from database import (
    create_session,
    create_otp_challenge,
    create_user,
    ensure_demo_user,
    find_user_by_credentials,
    find_user_by_mobile_number,
    get_collection,
    get_session,
    get_users_collection,
    list_recent_analyses,
    revoke_session,
    save_analysis,
    verify_otp_challenge,
)


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
REPORT_DIR = BASE_DIR / "reports"
MODEL_REPORT_PATH = BASE_DIR / "models" / "model_comparison.json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Heart-IQ Digital Twin API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginPayload(BaseModel):
    mobile_number: str
    dob: str


class RegisterPayload(BaseModel):
    mobile_number: str
    dob: str
    full_name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    known_conditions: Optional[str] = None


class OtpRequestPayload(BaseModel):
    mobile_number: str
    dob: str


class OtpVerifyPayload(BaseModel):
    mobile_number: str
    dob: str
    otp_code: str


def serialize_user(user: dict) -> dict:
    return {
        "mobile_number": user["mobile_number"],
        "full_name": user.get("full_name", "Heart-IQ User"),
        "age": user.get("age"),
        "sex": user.get("sex", "not_specified"),
        "known_conditions": user.get("known_conditions", ""),
        "role": user.get("role", "user"),
    }


def extract_token(authorization: str = Header(default="")) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Login required.")

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid session token.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid session token.")

    return token


def get_authenticated_user(authorization: str = Header(default="")) -> dict:
    token = extract_token(authorization)
    session = get_session(token)
    if session is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please log in again.")

    user = find_user_by_mobile_number(str(session.get("mobile_number", "")).strip())
    if user is None:
        raise HTTPException(status_code=401, detail="User account not found for this session.")

    return {
        "user": user,
        "session": session,
        "session_token": token,
    }


@app.on_event("startup")
def startup_tasks() -> None:
    ensure_demo_user()


@app.get("/health")
def health_check() -> dict[str, str]:
    collection = get_collection()
    users_collection = get_users_collection()
    return {
        "status": "ok",
        "service": "heart-iq-backend",
        "mongodb": "connected" if collection is not None else "not_configured",
        "users_store": "ready" if users_collection is not None else "not_configured",
    }


@app.get("/history")
def analysis_history(authorization: str = Header(default="")) -> dict:
    auth = get_authenticated_user(authorization)
    return {
        "items": list_recent_analyses(str(auth["user"]["mobile_number"]).strip() or None),
    }


@app.get("/model-comparison")
def model_comparison() -> dict:
    if not MODEL_REPORT_PATH.exists():
        return {
            "best_model": None,
            "all_models": [],
        }

    try:
        return json.loads(MODEL_REPORT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Model comparison report is not readable.") from exc


@app.get("/auth/me")
def current_session(authorization: str = Header(default="")) -> dict:
    auth = get_authenticated_user(authorization)
    session = auth["session"]
    user = auth["user"]
    return {
        "authenticated": True,
        "user": {
            "mobile_number": user["mobile_number"],
            "full_name": user.get("full_name", "Heart-IQ User"),
            "age": user.get("age"),
            "sex": user.get("sex", "not_specified"),
            "known_conditions": user.get("known_conditions", ""),
            "role": user.get("role", "user"),
        },
        "session_token": auth["session_token"],
        "session_expires_at": session["expires_at"].isoformat(timespec="seconds"),
    }


@app.post("/auth/login")
def login(payload: LoginPayload) -> dict:
    user = find_user_by_credentials(payload.mobile_number.strip(), payload.dob.strip())
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid mobile number or DOB.")

    session = create_session(user["mobile_number"])
    if session is None:
        raise HTTPException(status_code=500, detail="Unable to create a secure session.")

    return {
        "authenticated": True,
        "user": serialize_user(user),
        **session,
    }


@app.post("/auth/otp/request")
def request_otp(payload: OtpRequestPayload) -> dict:
    mobile_number = payload.mobile_number.strip()
    dob = payload.dob.strip()
    user = find_user_by_credentials(mobile_number, dob)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid mobile number or DOB.")

    challenge = create_otp_challenge(mobile_number)
    if challenge is None:
        raise HTTPException(status_code=500, detail="Unable to create OTP challenge.")

    return {
        "otp_sent": True,
        "mobile_number": mobile_number,
        "masked_mobile_number": f"{mobile_number[:2]}******{mobile_number[-2:]}",
        **challenge,
    }


@app.post("/auth/otp/verify")
def verify_otp(payload: OtpVerifyPayload) -> dict:
    mobile_number = payload.mobile_number.strip()
    dob = payload.dob.strip()
    user = find_user_by_credentials(mobile_number, dob)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid mobile number or DOB.")

    if not verify_otp_challenge(mobile_number, payload.otp_code.strip()):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")

    session = create_session(user["mobile_number"])
    if session is None:
        raise HTTPException(status_code=500, detail="Unable to create a secure session.")

    return {
        "authenticated": True,
        "user": serialize_user(user),
        **session,
    }


@app.post("/auth/register")
def register(payload: RegisterPayload) -> dict:
    mobile_number = payload.mobile_number.strip()
    dob = payload.dob.strip()
    full_name = payload.full_name.strip() if payload.full_name else None
    sex = payload.sex.strip() if payload.sex else None
    known_conditions = payload.known_conditions.strip() if payload.known_conditions else None

    created = create_user(mobile_number, dob, full_name, payload.age, sex, known_conditions)
    if created is None:
        raise HTTPException(status_code=500, detail="Unable to create user in MongoDB.")
    if created.get("error") == "exists":
        raise HTTPException(status_code=409, detail="A user with this mobile number already exists.")

    session = create_session(created["mobile_number"])
    if session is None:
        raise HTTPException(status_code=500, detail="Unable to create a secure session.")

    return {
        "created": True,
        "user": serialize_user(created),
        **session,
    }


def parse_json_context(raw_context: str) -> dict:
    if not raw_context:
        return {}

    try:
        payload = json.loads(raw_context)
    except json.JSONDecodeError:
        return {}

    return payload if isinstance(payload, dict) else {}


def build_care_guidance(result: dict, clinical_context: dict) -> dict:
    symptoms = clinical_context.get("symptoms", [])
    symptoms = symptoms if isinstance(symptoms, list) else []
    notes = str(clinical_context.get("notes", "")).strip()
    severity_label = result.get("severity", {}).get("label", "low")
    diagnosis = result.get("diagnosis", "Normal")
    bpm = int(result.get("bpm", 0))
    urgent_symptoms = {"chest_pain", "fainting", "severe_breathlessness", "blue_lips"}
    concerning_symptoms = {"shortness_of_breath", "palpitations", "dizziness", "swelling", "fatigue"}

    has_urgent = any(symptom in urgent_symptoms for symptom in symptoms)
    has_concerning = any(symptom in concerning_symptoms for symptom in symptoms)

    if has_urgent:
        priority = "urgent"
        message = "Urgent warning signs were reported. Seek emergency medical care immediately or contact local emergency services."
    elif diagnosis == "Abnormal" or severity_label == "high" or bpm > 120 or bpm < 45:
        priority = "doctor_visit"
        message = "Book a cardiology or physician consultation soon. Carry this acoustic report and repeat the recording if possible."
    elif has_concerning or severity_label == "moderate":
        priority = "follow_up"
        message = "A medical follow-up is recommended, especially if symptoms continue or occur during activity."
    else:
        priority = "routine"
        message = "No urgent symptom pattern was reported. Continue routine monitoring and consult a doctor if symptoms appear."

    actions = [
        "Do not use this prototype as a final diagnosis.",
        "Visit a qualified doctor for confirmation if symptoms are present or the result is abnormal.",
        "Repeat the recording in a quiet environment if signal quality is moderate or poor.",
    ]
    if notes:
        actions.append("Share the symptom notes with the clinician.")

    return {
        "priority": priority,
        "message": message,
        "reported_symptoms": symptoms,
        "notes": notes,
        "actions": actions,
    }


def extract_owner_context(clinical_context: dict) -> dict:
    patient = clinical_context.get("patient", {})
    if not isinstance(patient, dict):
        patient = {}

    owner_mobile_number = str(patient.get("mobile_number", "")).strip()
    owner_full_name = str(patient.get("full_name", "")).strip()

    return {
        "owner_mobile_number": owner_mobile_number or None,
        "owner_full_name": owner_full_name or None,
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), clinical_context: str = Form(""), authorization: str = Header(default="")) -> dict:
    auth = get_authenticated_user(authorization)
    if not file.filename or not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Please upload a .wav file.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target_path = UPLOAD_DIR / f"{timestamp}_{Path(file.filename).name}"
    target_path.write_bytes(await file.read())

    try:
        result = analyze_wav_file(target_path)
    except AnalysisError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Analysis pipeline failed.") from exc

    context = parse_json_context(clinical_context)
    patient_context = dict(context.get("patient", {})) if isinstance(context.get("patient", {}), dict) else {}
    patient_context["mobile_number"] = auth["user"]["mobile_number"]
    patient_context["full_name"] = auth["user"].get("full_name", patient_context.get("full_name"))
    context["patient"] = patient_context
    care_guidance = build_care_guidance(result, context)
    owner_context = extract_owner_context(context)
    owner_context["owner_mobile_number"] = auth["user"]["mobile_number"]
    owner_context["owner_full_name"] = auth["user"].get("full_name")

    report = {
        "file_name": target_path.name,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "clinical_context": context,
        "care_guidance": care_guidance,
        **owner_context,
        **result,
    }

    report_path = REPORT_DIR / f"{target_path.stem}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    mongo_id = save_analysis(report)
    return {
        **report,
        "storage": {
            "json_report": str(report_path),
            "mongodb_id": mongo_id,
            "mongodb_enabled": mongo_id is not None or get_collection() is not None,
        },
    }


@app.post("/auth/logout")
def logout(authorization: str = Header(default="")) -> dict:
    token = extract_token(authorization)
    revoked = revoke_session(token)
    return {"logged_out": True, "revoked": revoked}
