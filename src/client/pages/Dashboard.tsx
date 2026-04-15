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
  background: "#1a1714",
};

const sidebarStyle: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderRight: "1px solid rgba(232,226,216,0.08)",
  display: "flex",
  flexDirection: "column",
  padding: "20px 16px",
  gap: 4,
};

const logoRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 20,
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
  color: "#1a1714",
  flexShrink: 0,
};

const venueNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#e8e2d8",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: "32px 40px",
  gap: 32,
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: 28,
  fontWeight: 300,
  color: "#e8e2d8",
  letterSpacing: "-0.01em",
  margin: 0,
};

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 20,
};

const statCardStyle: React.CSSProperties = {
  flex: 1,
  padding: "24px",
  borderRadius: 12,
  background: "rgba(232,226,216,0.04)",
  border: "1px solid rgba(232,226,216,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 300,
  color: "#e8e2d8",
  fontFamily: "var(--rialto-font-display, system-ui)",
  letterSpacing: "-0.02em",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  color: "rgba(232,226,216,0.4)",
};

const DEFAULT_ACCENT = "#c49a2a";

function NavItem({
  label,
  active,
  accent,
}: {
  label: string;
  active: boolean;
  accent: string;
}) {
  const style: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? accent : "rgba(232,226,216,0.4)",
    background: active ? `${accent}1a` : "transparent",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  return <div style={style}>{label}</div>;
}

function DashboardContent({ data }: { data: VenueWithTheme }) {
  const { venue, theme } = data;
  const accent = theme.accent ?? DEFAULT_ACCENT;
  const initial = venue.name.charAt(0).toUpperCase();

  return (
    <VenueThemeProvider theme={theme}>
      <div style={pageStyle}>
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
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1714",
          color: "rgba(232,226,216,0.5)",
          fontSize: 14,
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1714",
        }}
      />
    );
  }

  return <DashboardContent data={data} />;
}
