import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { useAuth } from "../hooks/useAuth";
import { VenueThemeProvider } from "../providers/VenueTheme";
import { DeleteVenueDialog } from "../features/venues/components/DeleteVenueDialog";
import type { VenueWithTheme } from "@shared/types";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const NAV_ITEMS = [
  { label: "Dashboard", active: true, path: "/" },
  { label: "Reservations", active: false, path: null },
  { label: "Waitlist", active: false, path: null },
  { label: "Floor Plan", active: false, path: "/floor-plan" },
  { label: "Guests", active: false, path: "/guests" },
] as const;

const STAT_CARDS = [
  { label: "Reservations", value: 0 },
  { label: "Waitlist", value: 0 },
  { label: "Tables", value: 0 },
] as const;

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
  fontFamily: "var(--rialto-font-display, system-ui)",
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
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  textTransform: "uppercase" as const,
  letterSpacing: "var(--rialto-tracking-wide, 0.1em)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
};

const DEFAULT_ACCENT = "#c49a2a";

function NavItem({
  label,
  active,
  accent,
  index,
  path,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly accent: string;
  readonly index: number;
  readonly path: string | null;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleClick = useCallback(() => {
    if (path) navigate(path);
  }, [navigate, path]);

  const background = active
    ? `${accent}1a`
    : hovered
      ? "var(--rialto-surface-recessed, rgba(232,226,216,0.04))"
      : "transparent";

  const style: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 12px)",
    fontWeight: active ? 600 : 400,
    color: active ? accent : "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
    background,
    cursor: path ? "pointer" : "default",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "background 0.2s ease, color 0.2s ease",
    boxShadow: active ? "var(--rialto-shadow-sm, 0 1px 3px rgba(0,0,0,0.2))" : "none",
  };

  return (
    <motion.button
      type="button"
      variants={fadeUp}
      transition={spring}
      custom={index}
      style={ms(style)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </motion.button>
  );
}

function SkeletonBlock({ style }: { readonly style: React.CSSProperties }) {
  return (
    <motion.div
      style={ms(style)}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
    />
  );
}

const deleteVenueLinkStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  color: "var(--rialto-error, #e07070)",
  background: "transparent",
  border: "none",
  padding: "6px 10px",
  cursor: "pointer",
  textAlign: "left" as const,
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  marginTop: "auto",
};

function DashboardContent({
  data,
  onDeleteVenue,
}: {
  readonly data: VenueWithTheme;
  readonly onDeleteVenue: () => void;
}) {
  const { venue, theme } = data;
  const accent = theme.accent ?? DEFAULT_ACCENT;
  const initial = venue.name.charAt(0).toUpperCase();

  return (
    <VenueThemeProvider theme={theme}>
      <div style={pageStyle} data-theme="dark">
        <motion.nav
          aria-label="Main navigation"
          style={ms(sidebarStyle)}
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.06, delayChildren: 0.1 }}
        >
          <motion.div variants={fadeUp} transition={spring} style={ms(logoRowStyle)}>
            {venue.logoUrl ? (
              <img
                src={venue.logoUrl}
                alt={`${venue.name} logo`}
                style={{ ...logoBoxStyle, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{ ...logoBoxStyle, background: accent }}
                aria-label={`${venue.name} logo`}
                role="img"
              >
                {initial}
              </div>
            )}
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={venueNameStyle}>{venue.name}</div>
            </div>
          </motion.div>

          {NAV_ITEMS.map((item, i) => (
            <NavItem
              key={item.label}
              label={item.label}
              active={item.active}
              accent={accent}
              index={i}
              path={item.path}
            />
          ))}

          <motion.button
            type="button"
            variants={fadeUp}
            transition={spring}
            style={ms(deleteVenueLinkStyle)}
            onClick={onDeleteVenue}
          >
            Delete Venue
          </motion.button>
        </motion.nav>

        <main id="main-content">
          <motion.div
            style={ms(mainStyle)}
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
          >
            <motion.h1 variants={fadeUp} transition={spring} style={ms(headingStyle)}>
              Dashboard
            </motion.h1>
            <motion.div
              style={ms(statsRowStyle)}
              role="region"
              aria-label="Venue statistics"
              variants={fadeUp}
              transition={{ ...spring, staggerChildren: 0.1 }}
            >
              {STAT_CARDS.map((card) => (
                <motion.div
                  key={card.label}
                  variants={fadeUp}
                  transition={spring}
                  style={ms(statCardStyle)}
                >
                  <div style={statValueStyle} aria-label={`${card.value} ${card.label}`}>{card.value}</div>
                  <div style={statLabelStyle}>{card.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </main>
      </div>
    </VenueThemeProvider>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<VenueWithTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleOpenDelete = useCallback(() => setShowDeleteDialog(true), []);
  const handleCloseDelete = useCallback(() => setShowDeleteDialog(false), []);
  const handleDeleted = useCallback(() => navigate("/"), [navigate]);

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
      <main
        id="main-content"
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
        <div role="alert">{error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <div style={pageStyle} data-theme="dark" role="status" aria-label="Loading dashboard" aria-busy="true">
        <div style={sidebarStyle} aria-hidden="true">
          <div style={logoRowStyle}>
            <SkeletonBlock style={{ ...logoBoxStyle, background: "var(--rialto-surface-matte, rgba(232,226,216,0.08))" }} />
            <SkeletonBlock style={{ flex: 1, height: 14, borderRadius: 4, background: "var(--rialto-surface-elevated, rgba(232,226,216,0.06))" }} />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock
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
          <SkeletonBlock style={{ width: 180, height: 28, borderRadius: "var(--rialto-radius-sharp, 6px)", background: "var(--rialto-surface-elevated, rgba(232,226,216,0.06))" }} />
          <div style={statsRowStyle}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...statCardStyle, minHeight: 100 }}>
                <SkeletonBlock style={{ width: 48, height: 36, borderRadius: "var(--rialto-radius-sharp, 6px)", background: "var(--rialto-surface-elevated, rgba(232,226,216,0.06))" }} />
                <SkeletonBlock style={{ width: 80, height: 12, borderRadius: 4, background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardContent data={data} onDeleteVenue={handleOpenDelete} />
      <DeleteVenueDialog
        venueName={data.venue.name}
        tenantId={user!.tenantId!}
        open={showDeleteDialog}
        onClose={handleCloseDelete}
        onDeleted={handleDeleted}
      />
    </>
  );
}
