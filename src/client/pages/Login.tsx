import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const { user } = useAuth();

  if (user?.tenantId) return <Navigate to="/" />;
  if (user) return <Navigate to="/onboarding" />;

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1a1714 0%, #2a2520 100%)",
    position: "relative",
    overflow: "hidden",
  };

  const glowStyle: React.CSSProperties = {
    position: "absolute",
    width: "400px",
    height: "400px",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background:
      "radial-gradient(circle, rgba(196,154,42,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  };

  const logoStyle: React.CSSProperties = {
    width: "64px",
    height: "64px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #c49a2a 0%, #a07d1f 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 24px rgba(196,154,42,0.3)",
    marginBottom: "20px",
  };

  const logoLetterStyle: React.CSSProperties = {
    fontSize: "28px",
    color: "#1a1714",
    fontWeight: 500,
    lineHeight: 1,
  };

  const appNameStyle: React.CSSProperties = {
    fontFamily: "var(--rialto-font-display, system-ui)",
    fontSize: "32px",
    fontWeight: 300,
    color: "#e8e2d8",
    letterSpacing: "-0.02em",
    marginBottom: "8px",
  };

  const taglineStyle: React.CSSProperties = {
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(232,226,216,0.5)",
    marginBottom: "40px",
  };

  const googleButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid rgba(232,226,216,0.2)",
    background: "rgba(232,226,216,0.05)",
    color: "#e8e2d8",
    fontSize: "14px",
    fontWeight: 500,
    letterSpacing: "0.01em",
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 0.15s, border-color 0.15s",
  };

  const subtextStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "rgba(232,226,216,0.3)",
    marginTop: "24px",
  };

  return (
    <div style={pageStyle} data-theme="dark">
      <div style={glowStyle} />
      <div style={contentStyle}>
        <div style={logoStyle}>
          <span style={logoLetterStyle}>E</span>
        </div>
        <div style={appNameStyle}>eat sheet</div>
        <div style={taglineStyle}>hospitality, refined</div>
        <a href="/api/auth/google" style={googleButtonStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>
        <div style={subtextStyle}>No credit card required</div>
      </div>
    </div>
  );
}
