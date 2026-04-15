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
    <div style={pageStyle}>
      <div style={glowStyle} />
      <div style={contentStyle}>
        <div style={logoStyle}>
          <span style={logoLetterStyle}>E</span>
        </div>
        <div style={appNameStyle}>eat sheet</div>
        <div style={taglineStyle}>hospitality, refined</div>
        <a href="/api/auth/google" style={googleButtonStyle}>
          Continue with Google
        </a>
        <div style={subtextStyle}>No credit card required</div>
      </div>
    </div>
  );
}
