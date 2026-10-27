import { useEffect, useState } from "react";
import {
  loginWithMobileAndDob,
  logoutWithToken,
  registerWithMobileAndDob,
  requestOtpLogin,
  verifyOtpLogin,
  verifySessionToken
} from "../services/auth";

const STORAGE_KEY = "heartiq-session";

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.session_token ? parsed : null;
  } catch {
    return null;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState(readStoredSession);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function verifyStoredSession() {
      if (!session?.session_token) {
        window.localStorage.removeItem(STORAGE_KEY);
        if (mounted) {
          setSession(null);
          setIsSessionReady(true);
        }
        return;
      }

      try {
        const payload = await verifySessionToken(session.session_token);
        const nextSession = {
          ...payload.user,
          session_token: payload.session_token,
          session_expires_at: payload.session_expires_at
        };
        if (!mounted) {
          return;
        }
        setSession(nextSession);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      } catch {
        if (mounted) {
          setSession(null);
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        if (mounted) {
          setIsSessionReady(true);
        }
      }
    }

    verifyStoredSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [session, isSessionReady]);

  async function login(credentials) {
    setIsLoggingIn(true);
    setAuthError("");

    try {
      const payload = await loginWithMobileAndDob(credentials);
      setSession({ ...payload.user, session_token: payload.session_token, session_expires_at: payload.session_expires_at });
      return { ...payload.user, session_token: payload.session_token, session_expires_at: payload.session_expires_at };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function requestOtp(credentials) {
    setIsLoggingIn(true);
    setAuthError("");

    try {
      return await requestOtpLogin(credentials);
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function verifyOtp(credentials) {
    setIsLoggingIn(true);
    setAuthError("");

    try {
      const payload = await verifyOtpLogin(credentials);
      setSession({ ...payload.user, session_token: payload.session_token, session_expires_at: payload.session_expires_at });
      return { ...payload.user, session_token: payload.session_token, session_expires_at: payload.session_expires_at };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function register(credentials) {
    setIsLoggingIn(true);
    setAuthError("");

    try {
      const payload = await registerWithMobileAndDob(credentials);
      setSession({ ...payload.user, session_token: payload.session_token, session_expires_at: payload.session_expires_at });
      return { ...payload.user, session_token: payload.session_token, session_expires_at: payload.session_expires_at };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function logout() {
    const token = session?.session_token;
    if (token) {
      try {
        await logoutWithToken(token);
      } catch {
        // Clear local session even if server-side revocation fails.
      }
    }
    setSession(null);
    setAuthError("");
  }

  return {
    user: session,
    isAuthenticated: Boolean(session),
    isSessionReady,
    isLoggingIn,
    authError,
    login,
    requestOtp,
    verifyOtp,
    register,
    logout,
    clearAuthError: () => setAuthError("")
  };
}
