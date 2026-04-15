import { motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

interface ThemePreviewProps {
  readonly accent: string;
  readonly venueName: string;
}

const cardStyle: React.CSSProperties = {
  background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
  borderRadius: "var(--rialto-radius-soft, 10px)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  padding: "var(--rialto-space-lg, 16px) var(--rialto-space-xl, 20px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-md, 14px)",
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 11px)",
  textTransform: "uppercase",
  letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.35))",
  marginBottom: "var(--rialto-space-2xs, 2px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const venueBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--rialto-space-sm, 8px)",
  padding: "4px 10px",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  fontSize: "var(--rialto-text-sm, 13px)",
  fontWeight: 600,
  color: "var(--rialto-text-on-accent, #1a1918)",
  letterSpacing: "var(--rialto-tracking-tight, 0.01em)",
  fontFamily: "var(--rialto-font-display, system-ui)",
  transition: "background 0.3s ease",
};

const inputPreviewStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  background: "var(--rialto-surface-elevated, rgba(232,226,216,0.06))",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
  fontSize: "var(--rialto-text-sm, 13px)",
  boxSizing: "border-box",
  cursor: "default",
  outline: "none",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-sm, 8px)",
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  background: "transparent",
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.6))",
  fontSize: "var(--rialto-text-sm, 13px)",
  cursor: "default",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

export function ThemePreview({ accent, venueName }: ThemePreviewProps) {
  const confirmButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    border: "none",
    background: accent,
    color: "var(--rialto-text-on-accent, #1a1918)",
    fontSize: "var(--rialto-text-sm, 13px)",
    fontWeight: 600,
    cursor: "default",
    boxShadow: `0 2px 8px ${accent}44`,
    fontFamily: "var(--rialto-font-sans, system-ui)",
    transition: "background 0.25s ease, box-shadow 0.25s ease",
  };

  return (
    <motion.div
      style={ms(cardStyle)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div style={previewLabelStyle}>Live preview</div>

      <div
        style={{
          ...venueBadgeStyle,
          background: accent,
        }}
      >
        {venueName || "Your Venue"}
      </div>

      <div>
        <div
          style={{
            fontSize: "var(--rialto-text-xs, 11px)",
            color: "var(--rialto-text-tertiary, rgba(232,226,216,0.35))",
            marginBottom: "var(--rialto-space-xs, 4px)",
            letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
          }}
        >
          Sample field
        </div>
        <input
          readOnly
          tabIndex={-1}
          style={{
            ...inputPreviewStyle,
            borderColor: accent + "66",
            transition: "border-color 0.3s ease",
          }}
          value="Guest name..."
        />
      </div>

      <div style={buttonRowStyle}>
        <button type="button" tabIndex={-1} style={cancelButtonStyle}>
          Cancel
        </button>
        <button type="button" tabIndex={-1} style={confirmButtonStyle}>
          Confirm
        </button>
      </div>
    </motion.div>
  );
}
