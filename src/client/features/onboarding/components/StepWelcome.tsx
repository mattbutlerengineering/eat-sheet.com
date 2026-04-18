import { useMemo } from "react";
import { FlipDot, textToMatrix } from "@mattbutlerengineering/rialto";
import { motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { TemplateMiniPreview } from "./TemplateMiniPreview";
import { TEMPLATES, TEMPLATE_SIZES, templateIdFromName } from "@shared/templates/floor-plan";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

interface StepWelcomeProps {
  venueName: string;
  accent: string;
  logoUrl: string | null;
  cuisines: readonly string[];
  floorPlan: FloorPlanSelection | null;
  isSubmitting: boolean;
  onEnter: () => void;
}

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-2xl, 28px)",
};

const flipDotWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "var(--rialto-space-xs, 8px) 0",
};

const shellStyle: React.CSSProperties = {
  height: 300,
  borderRadius: "var(--rialto-radius-soft, 12px)",
  border: "1px solid var(--rialto-border)",
  overflow: "hidden",
  display: "flex",
  background: "var(--rialto-surface)",
};

const sidebarStyle: React.CSSProperties = {
  width: 200,
  flexShrink: 0,
  borderRight: "1px solid var(--rialto-border)",
  display: "flex",
  flexDirection: "column",
  padding: "var(--rialto-space-md, 16px) var(--rialto-space-sm, 12px)",
  gap: "var(--rialto-space-xs, 8px)",
  background: "var(--rialto-surface)",
};

const logoRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--rialto-space-sm, 10px)",
  marginBottom: "var(--rialto-space-md, 12px)",
};

const logoBoxStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "var(--rialto-radius-default, 8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "var(--rialto-text-sm, 13px)",
  fontWeight: "var(--rialto-weight-demi, 700)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-on-accent)",
  flexShrink: 0,
};

const venueNameStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const cuisineStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "10px",
  color: "var(--rialto-text-tertiary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: "var(--rialto-space-md, 12px)",
  padding: "var(--rialto-space-xl, 24px)",
  background: "var(--rialto-surface-recessed)",
};

const welcomeHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-md, 18px)",
  fontWeight: "var(--rialto-weight-light, 300)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary)",
  letterSpacing: "var(--rialto-tracking-tight, -0.01em)",
  margin: 0,
  textAlign: "center",
};

const welcomeSubtextStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-sm, 13px)",
  color: "var(--rialto-text-secondary)",
  margin: 0,
  textAlign: "center",
};

const ctaWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

export function StepWelcome({
  venueName,
  accent,
  logoUrl,
  cuisines,
  floorPlan,
  isSubmitting,
  onEnter,
}: StepWelcomeProps) {
  const matrix = textToMatrix(venueName.toUpperCase(), { letterSpacing: 1 });

  const initial = venueName.charAt(0).toUpperCase();
  const cuisineLabel = cuisines.slice(0, 3).join(" · ");

  const floorPlanPreview = useMemo(() => {
    if (!floorPlan) return null;
    const template = TEMPLATES.find(
      (t) => templateIdFromName(t.name) === floorPlan.templateId,
    );
    const size = TEMPLATE_SIZES.find(
      (s) => s.label.toLowerCase() === floorPlan.size,
    );
    if (!template || !size) return null;
    return template.build(size.width, size.height);
  }, [floorPlan]);

  const navItems = [
    { label: "Dashboard", active: true },
    { label: "Reservations", active: false },
    { label: "Waitlist", active: false },
    { label: floorPlan ? "Floor Plan ✓" : "Floor Plan", active: false },
    { label: "Guests", active: false },
  ];

  const ctaButtonStyle: React.CSSProperties = {
    padding: "var(--rialto-space-md, 12px) 32px",
    borderRadius: "var(--rialto-radius-default, 8px)",
    border: `1px solid ${accent}4d`,
    background: accent,
    color: "var(--rialto-text-on-accent)",
    fontSize: "var(--rialto-text-sm, 14px)",
    fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
    letterSpacing: "var(--rialto-tracking-tight, 0.01em)",
    cursor: isSubmitting ? "not-allowed" : "pointer",
    opacity: isSubmitting ? 0.7 : 1,
    transition: "opacity 150ms ease",
  };

  const activeNavItemStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "var(--rialto-space-xs, 8px) var(--rialto-space-sm, 10px)",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    fontSize: "var(--rialto-text-xs, 12px)",
    fontWeight: (isActive
      ? "var(--rialto-weight-demi, 600)"
      : "var(--rialto-weight-regular, 400)") as React.CSSProperties["fontWeight"],
    color: isActive ? accent : "var(--rialto-text-tertiary)",
    background: isActive ? `${accent}1a` : "transparent",
    cursor: "default",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  const previewCTAStyle: React.CSSProperties = {
    marginTop: "var(--rialto-space-xs, 8px)",
    padding: "6px 16px",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    border: "none",
    background: accent,
    color: "var(--rialto-text-on-accent)",
    fontSize: "var(--rialto-text-xs, 12px)",
    fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
    cursor: "default",
  };

  return (
    <div style={wrapperStyle}>
      {/* FlipDot venue name reveal */}
      <div style={flipDotWrapperStyle}>
        <FlipDot
          matrix={matrix}
          dotSize={6}
          dotGap={2}
          enableSound
          soundVolume={0.2}
          staggerDelay={12}
          staggerDirection="left-to-right"
          aria-label={`${venueName} displayed in dot matrix`}
        />
      </div>

      {/* Themed app shell preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        style={ms({
          ...shellStyle,
          "--rialto-accent": accent,
        } as React.CSSProperties)}
      >
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <div style={logoRowStyle}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={venueName}
                style={{
                  ...logoBoxStyle,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  ...logoBoxStyle,
                  background: accent,
                }}
              >
                {initial}
              </div>
            )}
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={venueNameStyle}>{venueName}</div>
              {cuisineLabel && (
                <div style={cuisineStyle}>{cuisineLabel}</div>
              )}
            </div>
          </div>

          {navItems.map((item) => (
            <div key={item.label} style={activeNavItemStyle(item.active)}>
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div style={mainStyle}>
          {floorPlanPreview ? (
            <>
              <div style={{
                fontSize: "var(--rialto-text-xs, 11px)",
                color: "var(--rialto-text-tertiary)",
                fontFamily: "var(--rialto-font-sans, system-ui)",
              }}>
                Your floor plan
              </div>
              <div style={{ width: "100%", maxWidth: 320 }}>
                <TemplateMiniPreview payload={floorPlanPreview} height={120} />
              </div>
              <div style={{
                fontSize: 10,
                color: "var(--rialto-text-tertiary)",
                fontFamily: "var(--rialto-font-sans, system-ui)",
              }}>
                {floorPlanPreview.tables.length} tables · {floorPlanPreview.sections.length} sections
              </div>
            </>
          ) : (
            <>
              <h2 style={welcomeHeadingStyle}>Welcome to {venueName}</h2>
              <p style={welcomeSubtextStyle}>Your venue is ready.</p>
              <button type="button" tabIndex={-1} style={previewCTAStyle}>
                Get Started
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* CTA button */}
      <div style={ctaWrapperStyle}>
        <motion.button
          type="button"
          style={ms(ctaButtonStyle)}
          onClick={onEnter}
          disabled={isSubmitting}
          whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${accent}40` }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
        >
          {isSubmitting ? "Setting up…" : `Enter ${venueName} →`}
        </motion.button>
      </div>
    </div>
  );
}
