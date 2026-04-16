import { Navigate } from "react-router";
import { motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { useAuth } from "../hooks/useAuth";
import { noiseOverlayStyle } from "../styles/noise";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: `linear-gradient(135deg, var(--rialto-surface-recessed, #141312) 0%, var(--rialto-surface, #1e1c1a) 100%)`,
  position: "relative",
  overflow: "hidden",
};

const contentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  zIndex: 1,
};

const logoStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "var(--rialto-radius-soft, 14px)",
  background: "linear-gradient(135deg, var(--rialto-accent, #c49a2a) 0%, var(--rialto-accent-hover, #a07d1f) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 32px var(--rialto-accent-glow, rgba(196,154,42,0.3))",
  marginBottom: "var(--rialto-space-lg, 24px)",
};

const logoLetterStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-2xl, 32px)",
  fontWeight: "var(--rialto-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-on-accent, #1a1918)",
  lineHeight: 1,
};

const appNameStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-3xl, 40px)",
  fontWeight: "var(--rialto-weight-light, 300)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
  letterSpacing: "-0.03em",
  lineHeight: "var(--rialto-leading-tight, 1.2)",
  marginBottom: "var(--rialto-space-xs, 8px)",
};

const taglineStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  textTransform: "uppercase",
  letterSpacing: "var(--rialto-tracking-wide, 0.14em)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.5))",
};

const dividerStyle: React.CSSProperties = {
  width: 40,
  height: 1,
  background: "linear-gradient(90deg, transparent, var(--rialto-accent, #c49a2a), transparent)",
  margin: "var(--rialto-space-2xl, 40px) 0",
  opacity: 0.5,
};

const googleButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--rialto-space-sm, 10px)",
  padding: "12px 28px",
  borderRadius: "var(--rialto-radius-default, 8px)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  background: "var(--rialto-surface-elevated, rgba(232,226,216,0.05))",
  color: "var(--rialto-text-primary, #e8e2d8)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: "var(--rialto-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  letterSpacing: "var(--rialto-tracking-tight, 0.01em)",
  cursor: "pointer",
  textDecoration: "none",
  transition: "border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
};

const subtextStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.3))",
  marginTop: "var(--rialto-space-xl, 28px)",
};

export function Login() {
  const { user } = useAuth();

  if (user?.tenantId) return <Navigate to="/" />;
  if (user) return <Navigate to="/onboarding" />;

  return (
    <main style={pageStyle} data-theme="dark">
      {/* Primary ambient glow */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--rialto-accent-glow, rgba(196,154,42,0.12)) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Secondary warm glow — offset for depth */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,154,42,0.04) 0%, transparent 70%)",
          top: "35%",
          left: "60%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      <div style={noiseOverlayStyle} aria-hidden="true" />

      <motion.div
        style={ms(contentStyle)}
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.1, delayChildren: 0.15 }}
      >
        {/* Logo */}
        <motion.div
          variants={fadeUp}
          transition={spring}
          style={ms(logoStyle)}
          aria-hidden="true"
        >
          <span style={logoLetterStyle}>E</span>
        </motion.div>

        {/* App name */}
        <motion.h1 variants={fadeUp} transition={spring} style={ms(appNameStyle)}>
          eat sheet
        </motion.h1>

        {/* Tagline */}
        <motion.p variants={fadeUp} transition={spring} style={ms(taglineStyle)}>
          hospitality, refined
        </motion.p>

        {/* Decorative divider */}
        <motion.div variants={fadeUp} transition={spring} style={ms(dividerStyle)} aria-hidden="true" />

        {/* Google sign-in */}
        <motion.a
          href="/api/auth/google"
          aria-label="Sign in with Google"
          variants={fadeUp}
          transition={spring}
          style={ms(googleButtonStyle)}
          whileHover={{
            borderColor: "var(--rialto-accent, #c49a2a)",
            boxShadow: "0 0 20px var(--rialto-accent-glow, rgba(196,154,42,0.2))",
          }}
          whileTap={{ scale: 0.98 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </motion.a>

        {/* Subtext */}
        <motion.p variants={fadeUp} transition={spring} style={ms(subtextStyle)}>
          No credit card required
        </motion.p>
      </motion.div>
    </main>
  );
}
