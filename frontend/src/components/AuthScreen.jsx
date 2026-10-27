import { useMemo, useState } from "react";
import { motion } from "framer-motion";

export default function AuthScreen({
  onLogin,
  onRegister,
  onRequestOtp,
  onVerifyOtp,
  isLoggingIn,
  authError,
  clearAuthError
}) {
  const [mode, setMode] = useState("login");
  const [loginMethod, setLoginMethod] = useState("password");
  const [otpStage, setOtpStage] = useState("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("9999999999");
  const [dob, setDob] = useState("2002-01-01");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("not_specified");
  const [knownConditions, setKnownConditions] = useState("");

  const isOtpLogin = mode === "login" && loginMethod === "otp";
  const submitLabel = useMemo(() => {
    if (mode === "register") {
      return isLoggingIn ? "Creating..." : "Create Account";
    }

    if (isOtpLogin) {
      if (otpStage === "verify") {
        return isLoggingIn ? "Verifying OTP..." : "Verify OTP";
      }
      return isLoggingIn ? "Sending OTP..." : "Send OTP";
    }

    return isLoggingIn ? "Signing in..." : "Login";
  }, [isLoggingIn, isOtpLogin, mode, otpStage]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearAuthError();

    try {
      if (mode === "register") {
        await onRegister({ fullName, mobileNumber, dob, age, sex, knownConditions });
        return;
      }

      if (isOtpLogin && otpStage === "verify") {
        await onVerifyOtp({ mobileNumber, dob, otpCode });
        return;
      }

      if (isOtpLogin) {
        const payload = await onRequestOtp({ mobileNumber, dob });
        setOtpStage("verify");
        setOtpCode("");
        setOtpHint(payload.demo_otp ? `Demo OTP: ${payload.demo_otp}` : `OTP sent to ${payload.masked_mobile_number ?? mobileNumber}`);
        return;
      }

      await onLogin({ mobileNumber, dob });
    } catch {
      // Errors are surfaced through authError in the hook.
    }
  };

  const resetToPasswordLogin = () => {
    clearAuthError();
    setLoginMethod("password");
    setOtpStage("idle");
    setOtpCode("");
    setOtpHint("");
  };

  return (
    <div className="auth-root">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <p className="eyebrow">Secure Operator Access</p>
        <h1 className="auth-title">{mode === "login" ? "Heart-IQ Login" : "Create Heart-IQ Account"}</h1>
        <p className="auth-copy">
          {mode === "login"
            ? "Sign in using your mobile number and DOB, or switch to OTP verification for a second-factor login."
            : "Create a new operator account using a mobile number and date of birth."}
        </p>

        {mode === "login" ? (
          <div className="auth-method-switcher" role="tablist" aria-label="Login method">
            <button
              type="button"
              className={`auth-method-button ${loginMethod === "password" ? "active" : ""}`}
              onClick={resetToPasswordLogin}
            >
              DOB Login
            </button>
            <button
              type="button"
              className={`auth-method-button ${loginMethod === "otp" ? "active" : ""}`}
              onClick={() => {
                clearAuthError();
                setLoginMethod("otp");
                setOtpStage("idle");
                setOtpCode("");
                setOtpHint("");
              }}
            >
              OTP Login
            </button>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label className="auth-label">
                <span>Full Name</span>
                <input
                  className="auth-input"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </label>
              <div className="auth-row">
                <label className="auth-label">
                  <span>Age</span>
                  <input
                    className="auth-input"
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    placeholder="Age"
                  />
                </label>
                <label className="auth-label">
                  <span>Sex</span>
                  <select className="auth-input" value={sex} onChange={(event) => setSex(event.target.value)}>
                    <option value="not_specified">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
              <label className="auth-label">
                <span>Known Conditions</span>
                <input
                  className="auth-input"
                  type="text"
                  value={knownConditions}
                  onChange={(event) => setKnownConditions(event.target.value)}
                  placeholder="Example: hypertension, diabetes, none"
                />
              </label>
            </>
          ) : null}

          <label className="auth-label">
            <span>Mobile Number</span>
            <div className="auth-phone-field">
              <span className="auth-phone-prefix" aria-hidden="true">
                +91
              </span>
              <input
                className="auth-input auth-phone-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                placeholder="10-digit mobile number"
                aria-label="Mobile number with +91 country code"
                required
              />
            </div>
          </label>

          <label className="auth-label">
            <span>Date of Birth</span>
            <input
              className="auth-input"
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              required
            />
          </label>

          {isOtpLogin && otpStage === "verify" ? (
            <label className="auth-label">
              <span>OTP Code</span>
              <input
                className="auth-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="Enter 6-digit OTP"
                required
              />
            </label>
          ) : null}

          {otpHint ? <p className="auth-hint">{otpHint}</p> : null}
          {authError ? <p className="auth-error">{authError}</p> : null}

          <button type="submit" className="auth-button" disabled={isLoggingIn}>
            {submitLabel}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            clearAuthError();
            setMode((current) => (current === "login" ? "register" : "login"));
            setOtpStage("idle");
            setOtpCode("");
            setOtpHint("");
            setLoginMethod("password");
          }}
        >
          {mode === "login" ? "Create new account" : "Already have an account? Login"}
        </button>

        <div className="auth-demo">
          <strong>Demo credentials</strong>
          <span>Mobile: 9999999999</span>
          <span>DOB: 2002-01-01</span>
          <span>OTP mode shows the code locally in demo mode.</span>
        </div>
      </motion.div>
    </div>
  );
}
