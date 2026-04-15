import { FlipDot, textToMatrix } from "@mattbutlerengineering/rialto";

interface StepWelcomeProps {
  venueName: string;
  accent: string;
  logoUrl: string | null;
  cuisines: readonly string[];
  isSubmitting: boolean;
  onEnter: () => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", active: true },
  { label: "Reservations", active: false },
  { label: "Waitlist", active: false },
  { label: "Floor Plan", active: false },
  { label: "Guests", active: false },
];

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 28,
};

const flipDotWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "8px 0",
};

const shellStyle: React.CSSProperties = {
  height: 300,
  borderRadius: 12,
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
  padding: "16px 12px",
  gap: 8,
  background: "var(--rialto-surface)",
};

const logoRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const logoBoxStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--rialto-text-on-accent)",
  flexShrink: 0,
};

const venueNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--rialto-text-primary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const cuisineStyle: React.CSSProperties = {
  fontSize: 10,
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
  gap: 12,
  padding: 24,
  background: "var(--rialto-surface-recessed)",
};

const welcomeHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: 18,
  fontWeight: 300,
  color: "var(--rialto-text-primary)",
  letterSpacing: "-0.01em",
  margin: 0,
  textAlign: "center",
};

const welcomeSubtextStyle: React.CSSProperties = {
  fontSize: 13,
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
  isSubmitting,
  onEnter,
}: StepWelcomeProps) {
  const matrix = textToMatrix(venueName.toUpperCase(), { letterSpacing: 1 });

  const initial = venueName.charAt(0).toUpperCase();
  const cuisineLabel = cuisines.slice(0, 3).join(" · ");

  const ctaButtonStyle: React.CSSProperties = {
    padding: "12px 32px",
    borderRadius: 8,
    border: `1px solid ${accent}4d`,
    background: accent,
    color: "var(--rialto-text-on-accent)",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.01em",
    cursor: isSubmitting ? "not-allowed" : "pointer",
    opacity: isSubmitting ? 0.7 : 1,
    transition: "opacity 150ms ease",
  };

  const activeNavItemStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? accent : "var(--rialto-text-tertiary)",
    background: isActive ? `${accent}1a` : "transparent",
    cursor: "default",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  const previewCTAStyle: React.CSSProperties = {
    marginTop: 8,
    padding: "6px 16px",
    borderRadius: 6,
    border: "none",
    background: accent,
    color: "var(--rialto-text-on-accent)",
    fontSize: 12,
    fontWeight: 600,
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
        />
      </div>

      {/* Themed app shell preview */}
      <div
        style={{
          ...shellStyle,
          "--rialto-accent": accent,
        } as React.CSSProperties}
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

          {NAV_ITEMS.map((item) => (
            <div key={item.label} style={activeNavItemStyle(item.active)}>
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div style={mainStyle}>
          <h2 style={welcomeHeadingStyle}>Welcome to {venueName}</h2>
          <p style={welcomeSubtextStyle}>Your venue is ready.</p>
          <button type="button" tabIndex={-1} style={previewCTAStyle}>
            Get Started
          </button>
        </div>
      </div>

      {/* CTA button */}
      <div style={ctaWrapperStyle}>
        <button
          type="button"
          style={ctaButtonStyle}
          onClick={onEnter}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Setting up…" : `Enter ${venueName} →`}
        </button>
      </div>
    </div>
  );
}
