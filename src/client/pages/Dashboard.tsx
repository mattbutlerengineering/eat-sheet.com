import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { VenueThemeProvider } from "../providers/VenueTheme";
import type { VenueWithTheme } from "@shared/types";

const NAV_ITEMS = [
  { label: "Dashboard", active: true },
  { label: "Reservations", active: false },
  { label: "Waitlist", active: false },
  { label: "Floor Plan", active: false },
  { label: "Guests", active: false },
];

const STAT_CARDS = [
  { label: "Reservations", value: 0 },
  { label: "Waitlist", value: 0 },
  { label: "Tables", value: 0 },
];

const pageStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  background: "var(--rialto-surface, #1e1c1a)",
};

const sidebarStyle: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderRight: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  display: "flex",
  flexDirection: "column",
  padding: "var(--rialto-space-xl, 20px) var(--rialto-space-lg, 16px)",
  gap: "var(--rialto-space-xs, 4px)",
};

const logoRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--rialto-space-sm, 10px)",
  marginBottom: "var(--rialto-space-xl, 20px)",
};

const logoBoxStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "var(--rialto-radius-default, 8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "var(--rialto-text-sm, 13px)",
  fontWeight: 700,
  color: "var(--rialto-text-on-accent, #1a1918)",
  flexShrink: 0,
};

const venueNameStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  fontWeight: 600,
  color: "var(--rialto-text-primary, #e8e2d8)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: "var(--rialto-space-3xl, 32px) var(--rialto-space-4xl, 40px)",
  gap: "var(--rialto-space-3xl, 32px)",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-2xl, 28px)",
  fontWeight: 300,
  color: "var(--rialto-text-primary, #e8e2d8)",
  letterSpacing: "-0.01em",
  lineHeight: "var(--rialto-leading-tight, 1.2)",
  margin: 0,
};

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-xl, 20px)",
};

const statCardStyle: React.CSSProperties = {
  flex: 1,
  padding: "var(--rialto-space-lg, 24px)",
  borderRadius: "var(--rialto-radius-soft, 12px)",
  background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-sm, 8px)",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-4xl, 36px)",
  fontWeight: 300,
  color: "var(--rialto-text-primary, #e8e2d8)",
  fontFamily: "var(--rialto-font-display, system-ui)",
  letterSpacing: "-0.02em",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 12px)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
};

const DEFAULT_ACCENT = "#c49a2a";

function NavItem({
  label,
  active,
  accent,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly accent: string;
}) {
  const style: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 12px)",
    fontWeight: active ? 600 : 400,
    color: active ? accent : "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
    background: active ? `${accent}1a` : "transparent",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  return <div style={style}>{label}</div>;
}

function DashboardContent({ data }: { readonly data: VenueWithTheme }) {
  const { venue, theme } = data;
  const accent = theme.accent ?? DEFAULT_ACCENT;
  const initial = venue.name.charAt(0).toUpperCase();

  return (
    <VenueThemeProvider theme={theme}>
      <div style={pageStyle} data-theme="dark">
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <div style={logoRowStyle}>
            {venue.logoUrl ? (
              <img
                src={venue.logoUrl}
                alt={venue.name}
                style={{ ...logoBoxStyle, objectFit: "cover" }}
              />
            ) : (
              <div style={{ ...logoBoxStyle, background: accent }}>
                {initial}
              </div>
            )}
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={venueNameStyle}>{venue.name}</div>
            </div>
          </div>

          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              label={item.label}
              active={item.active}
              accent={accent}
            />
          ))}
        </div>

        {/* Main content */}
        <div style={mainStyle}>
          <h1 style={headingStyle}>Dashboard</h1>
          <div style={statsRowStyle}>
            {STAT_CARDS.map((card) => (
              <div key={card.label} style={statCardStyle}>
                <div style={statValueStyle}>{card.value}</div>
                <div style={statLabelStyle}>{card.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VenueThemeProvider>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<VenueWithTheme | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;

    fetch(`/api/t/${user.tenantId}/venue`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          setError("Failed to load venue");
          return;
        }
        const body = await res.json() as { ok: boolean; data?: VenueWithTheme; error?: string };
        if (body.ok && body.data) {
          setData(body.data);
        } else {
          setError(body.error ?? "Failed to load venue");
        }
      })
      .catch(() => setError("Something went wrong"));
  }, [user?.tenantId]);

  if (error) {
    return (
      <div
        data-theme="dark"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--rialto-surface, #1e1c1a)",
          color: "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
          fontSize: "var(--rialto-text-sm, 14px)",
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={pageStyle} data-theme="dark">
        <div style={sidebarStyle}>
          <div style={logoRowStyle}>
            <div style={{ ...logoBoxStyle, background: "var(--rialto-surface-matte, rgba(232,226,216,0.08))" }} />
            <div style={{ flex: 1, height: 14, borderRadius: 4, background: "var(--rialto-surface-elevated, rgba(232,226,216,0.06))" }} />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: 32,
                borderRadius: "var(--rialto-radius-sharp, 6px)",
                background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
              }}
            />
          ))}
        </div>
        <div style={mainStyle}>
          <div style={{ width: 180, height: 28, borderRadius: "var(--rialto-radius-sharp, 6px)", background: "var(--rialto-surface-elevated, rgba(232,226,216,0.06))" }} />
          <div style={statsRowStyle}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...statCardStyle, minHeight: 100 }}>
                <div style={{ width: 48, height: 36, borderRadius: "var(--rialto-radius-sharp, 6px)", background: "var(--rialto-surface-elevated, rgba(232,226,216,0.06))" }} />
                <div style={{ width: 80, height: 12, borderRadius: 4, background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <DashboardContent data={data} />;
}
