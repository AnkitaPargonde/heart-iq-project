from __future__ import annotations

import hashlib
from datetime import datetime
from datetime import timedelta
from os import getenv
import secrets

from pymongo import MongoClient
from pymongo.errors import PyMongoError


MONGODB_URL = getenv("MONGODB_URL", "mongodb://127.0.0.1:27017").strip()
MONGODB_DB = getenv("MONGODB_DB", "heart_iq")
MONGODB_COLLECTION = getenv("MONGODB_COLLECTION", "analyses")
MONGODB_USERS_COLLECTION = getenv("MONGODB_USERS_COLLECTION", "users")
MONGODB_SESSIONS_COLLECTION = getenv("MONGODB_SESSIONS_COLLECTION", "sessions")
MONGODB_OTP_COLLECTION = getenv("MONGODB_OTP_COLLECTION", "otp_codes")
DEFAULT_LOGIN_MOBILE = getenv("DEFAULT_LOGIN_MOBILE", "9999999999")
DEFAULT_LOGIN_DOB = getenv("DEFAULT_LOGIN_DOB", "2002-01-01")
DEFAULT_LOGIN_NAME = getenv("DEFAULT_LOGIN_NAME", "Heart-IQ Demo")
SESSION_TTL_HOURS = int(getenv("SESSION_TTL_HOURS", "12"))
OTP_TTL_MINUTES = int(getenv("OTP_TTL_MINUTES", "10"))
OTP_DEMO_MODE = getenv("OTP_DEMO_MODE", "true").strip().lower() not in {"0", "false", "no"}
OTP_SECRET = getenv("OTP_SECRET", "heart-iq-otp-secret")

_client: MongoClient | None = None


def get_collection():
    global _client

    if not MONGODB_URL:
        return None

    if _client is None:
        _client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=3000)

    return _client[MONGODB_DB][MONGODB_COLLECTION]


def get_users_collection():
    global _client

    if not MONGODB_URL:
        return None

    if _client is None:
        _client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=3000)

    return _client[MONGODB_DB][MONGODB_USERS_COLLECTION]


def get_sessions_collection():
    global _client

    if not MONGODB_URL:
        return None

    if _client is None:
        _client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=3000)

    return _client[MONGODB_DB][MONGODB_SESSIONS_COLLECTION]


def get_otp_collection():
    global _client

    if not MONGODB_URL:
        return None

    if _client is None:
        _client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=3000)

    return _client[MONGODB_DB][MONGODB_OTP_COLLECTION]


def save_analysis(report: dict) -> str | None:
    collection = get_collection()
    if collection is None:
        return None

    payload = {
        **report,
        "persisted_at": datetime.utcnow().isoformat(timespec="seconds"),
    }

    try:
        result = collection.insert_one(payload)
        return str(result.inserted_id)
    except PyMongoError:
        return None


def list_recent_analyses(mobile_number: str | None = None, limit: int | None = None) -> list[dict]:
    collection = get_collection()
    if collection is None:
        return []

    projection = {
        "_id": 1,
        "file_name": 1,
        "created_at": 1,
        "diagnosis": 1,
        "bpm": 1,
        "confidence": 1,
        "severity": 1,
        "signal_quality": 1,
        "model_source": 1,
        "owner_mobile_number": 1,
    }

    try:
        query = {"owner_mobile_number": mobile_number} if mobile_number else {}
        cursor = collection.find(query, projection).sort("created_at", -1)
        if limit is not None:
            cursor = cursor.limit(limit)
        documents = cursor
        return [{**document, "_id": str(document["_id"])} for document in documents]
    except PyMongoError:
        return []


def ensure_demo_user() -> bool:
    collection = get_users_collection()
    if collection is None:
        return False

    try:
        existing = collection.find_one({"mobile_number": DEFAULT_LOGIN_MOBILE})
        if existing:
            return True

        collection.insert_one(
            {
                "mobile_number": DEFAULT_LOGIN_MOBILE,
                "dob": DEFAULT_LOGIN_DOB,
                "full_name": DEFAULT_LOGIN_NAME,
                "age": 22,
                "sex": "female",
                "known_conditions": "Demo profile",
                "role": "demo_user",
                "created_at": datetime.utcnow().isoformat(timespec="seconds"),
            }
        )
        return True
    except PyMongoError:
        return False


def find_user_by_credentials(mobile_number: str, dob: str) -> dict | None:
    collection = get_users_collection()
    if collection is None:
        return None

    try:
        return collection.find_one({"mobile_number": mobile_number, "dob": dob})
    except PyMongoError:
        return None


def find_user_by_mobile_number(mobile_number: str) -> dict | None:
    collection = get_users_collection()
    if collection is None:
        return None

    try:
        return collection.find_one({"mobile_number": mobile_number})
    except PyMongoError:
        return None


def create_session(mobile_number: str) -> dict | None:
    collection = get_sessions_collection()
    if collection is None:
        return None

    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=SESSION_TTL_HOURS)
    payload = {
        "token": token,
        "mobile_number": mobile_number,
        "created_at": now,
        "expires_at": expires_at,
        "revoked_at": None,
    }

    try:
        collection.insert_one(payload)
        return {
            "session_token": token,
            "session_expires_at": expires_at.isoformat(timespec="seconds"),
        }
    except PyMongoError:
        return None


def get_session(token: str) -> dict | None:
    collection = get_sessions_collection()
    if collection is None:
        return None

    try:
        session = collection.find_one({"token": token})
        if session is None:
            return None

        revoked_at = session.get("revoked_at")
        expires_at = session.get("expires_at")
        now = datetime.utcnow()

        if revoked_at is not None or expires_at is None or expires_at <= now:
            return None

        return session
    except PyMongoError:
        return None


def revoke_session(token: str) -> bool:
    collection = get_sessions_collection()
    if collection is None:
        return False

    try:
        result = collection.update_one({"token": token, "revoked_at": None}, {"$set": {"revoked_at": datetime.utcnow()}})
        return bool(result.modified_count)
    except PyMongoError:
        return False


def _hash_otp(mobile_number: str, purpose: str, otp_code: str) -> str:
    payload = f"{mobile_number}:{purpose}:{otp_code}:{OTP_SECRET}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def create_otp_challenge(mobile_number: str, purpose: str = "login") -> dict | None:
    collection = get_otp_collection()
    if collection is None:
        return None

    code = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=OTP_TTL_MINUTES)
    payload = {
        "mobile_number": mobile_number,
        "purpose": purpose,
        "otp_hash": _hash_otp(mobile_number, purpose, code),
        "created_at": now,
        "expires_at": expires_at,
        "attempts": 0,
        "verified_at": None,
    }

    try:
        collection.insert_one(payload)
        response = {
            "otp_sent": True,
            "expires_at": expires_at.isoformat(timespec="seconds"),
        }
        if OTP_DEMO_MODE:
            response["demo_otp"] = code
        return response
    except PyMongoError:
        return None


def verify_otp_challenge(mobile_number: str, otp_code: str, purpose: str = "login") -> bool:
    collection = get_otp_collection()
    if collection is None:
        return False

    try:
        challenge = collection.find_one(
            {
                "mobile_number": mobile_number,
                "purpose": purpose,
                "verified_at": None,
            },
            sort=[("created_at", -1)],
        )
        if challenge is None:
            return False

        now = datetime.utcnow()
        if challenge.get("expires_at") is None or challenge["expires_at"] <= now:
            return False

        if int(challenge.get("attempts", 0)) >= 5:
            return False

        expected_hash = challenge.get("otp_hash", "")
        actual_hash = _hash_otp(mobile_number, purpose, str(otp_code).strip())
        if expected_hash != actual_hash:
            collection.update_one(
                {"_id": challenge["_id"]},
                {"$inc": {"attempts": 1}},
            )
            return False

        collection.update_one(
            {"_id": challenge["_id"]},
            {"$set": {"verified_at": now}},
        )
        return True
    except PyMongoError:
        return False


def create_user(
    mobile_number: str,
    dob: str,
    full_name: str | None = None,
    age: int | None = None,
    sex: str | None = None,
    known_conditions: str | None = None,
) -> dict | None:
    collection = get_users_collection()
    if collection is None:
        return None

    try:
        existing = collection.find_one({"mobile_number": mobile_number})
        if existing is not None:
            return {"error": "exists"}

        payload = {
            "mobile_number": mobile_number,
            "dob": dob,
            "full_name": full_name or "Heart-IQ User",
            "age": age,
            "sex": sex or "not_specified",
            "known_conditions": known_conditions or "",
            "role": "user",
            "created_at": datetime.utcnow().isoformat(timespec="seconds"),
        }
        result = collection.insert_one(payload)
        return {
            "inserted_id": str(result.inserted_id),
            "mobile_number": payload["mobile_number"],
            "full_name": payload["full_name"],
            "age": payload["age"],
            "sex": payload["sex"],
            "known_conditions": payload["known_conditions"],
            "role": payload["role"],
        }
    except PyMongoError:
        return None
