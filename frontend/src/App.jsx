import Dashboard from "./Dashboard";
import AuthScreen from "./components/AuthScreen";
import { useAuthSession } from "./hooks/useAuthSession";

export default function App() {
  const {
    user,
    isAuthenticated,
    isSessionReady,
    isLoggingIn,
    authError,
    login,
    register,
    requestOtp,
    verifyOtp,
    logout,
    clearAuthError
  } = useAuthSession();

  if (!isSessionReady) {
    return (
      <div className="auth-root">
        <div className="auth-card">
          <p className="eyebrow">Verifying secure session</p>
          <h1 className="auth-title">Heart-IQ</h1>
          <p className="auth-copy">Checking your login token before loading the dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLogin={login}
        onRegister={register}
        onRequestOtp={requestOtp}
        onVerifyOtp={verifyOtp}
        isLoggingIn={isLoggingIn}
        authError={authError}
        clearAuthError={clearAuthError}
      />
    );
  }

  return <Dashboard user={user} onLogout={logout} />;
}
