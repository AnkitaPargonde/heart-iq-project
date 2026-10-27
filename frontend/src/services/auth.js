const LOGIN_URL = import.meta.env.VITE_AUTH_URL ?? "http://127.0.0.1:8000/auth/login";
const REGISTER_URL = import.meta.env.VITE_REGISTER_URL ?? "http://127.0.0.1:8000/auth/register";
const OTP_REQUEST_URL = import.meta.env.VITE_OTP_REQUEST_URL ?? "http://127.0.0.1:8000/auth/otp/request";
const OTP_VERIFY_URL = import.meta.env.VITE_OTP_VERIFY_URL ?? "http://127.0.0.1:8000/auth/otp/verify";
const LOGOUT_URL = import.meta.env.VITE_LOGOUT_URL ?? "http://127.0.0.1:8000/auth/logout";
const SESSION_URL = import.meta.env.VITE_SESSION_URL ?? "http://127.0.0.1:8000/auth/me";

async function postJson(url, body, fallbackMessage, token = "") {
  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new Error("Backend is offline or unreachable. Start the FastAPI server and try again.");
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail ?? fallbackMessage);
  }

  return payload;
}

export async function loginWithMobileAndDob({ mobileNumber, dob }) {
  return postJson(
    LOGIN_URL,
    {
      mobile_number: mobileNumber,
      dob
    },
    "Login failed."
  );
}

export async function registerWithMobileAndDob({ fullName, mobileNumber, dob, age, sex, knownConditions }) {
  return postJson(
    REGISTER_URL,
    {
      full_name: fullName,
      mobile_number: mobileNumber,
      dob,
      age: age ? Number(age) : null,
      sex,
      known_conditions: knownConditions
    },
    "Registration failed."
  );
}

export async function requestOtpLogin({ mobileNumber, dob }) {
  return postJson(
    OTP_REQUEST_URL,
    {
      mobile_number: mobileNumber,
      dob
    },
    "OTP request failed."
  );
}

export async function verifyOtpLogin({ mobileNumber, dob, otpCode }) {
  return postJson(
    OTP_VERIFY_URL,
    {
      mobile_number: mobileNumber,
      dob,
      otp_code: otpCode
    },
    "OTP verification failed."
  );
}

export async function logoutWithToken(token) {
  return postJson(LOGOUT_URL, {}, "Logout failed.", token);
}

export async function verifySessionToken(token) {
  let response;

  try {
    response = await fetch(SESSION_URL, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error("Backend is offline or unreachable. Start the FastAPI server and try again.");
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail ?? "Session verification failed.");
  }

  return payload;
}
