import { useEffect, useState } from "react";
import { login, wakeBackend } from "../api/client";

export default function LoginForm({ onSuccess, appTitle }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    wakeBackend();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const data = await login(username.trim(), password);
      onSuccess(data.username);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-brand">
          <div className="login-brand-top">
            <img
              className="login-logo"
              src="/assetcues-logo.png"
              alt="AssetCues"
            />
            <span className="login-badge">PO Classification</span>
          </div>
          <h1 className="login-headline">
            Upload, review, and classify
            <br />
            <span>PO data</span>
          </h1>
          <p className="login-lead">
            Upload Excel and check results in one place.
          </p>
          <div className="login-hero-wrap">
            <video
              className="login-hero-video"
              src="/assetcues-animation-nobg.webm"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          </div>
        </aside>

        <form className="login-card panel" onSubmit={handleSubmit}>
          <h2 className="login-title">{appTitle}</h2>
          <p className="login-subtitle">Sign in to continue</p>
          {error ? <div className="error-banner">{error}</div> : null}
          <label className="login-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="login-field">
            <span>Password</span>
            <div className="login-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                    />
                    <path
                      fill="currentColor"
                      d="M3.3 3.3a1 1 0 0 1 1.4 0l16 16a1 1 0 0 1-1.4 1.4l-16-16a1 1 0 0 1 0-1.4z"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
