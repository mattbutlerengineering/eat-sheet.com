import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { VenueThemeProvider } from "./providers/VenueTheme";
import { useAuth } from "./hooks/useAuth";
import { useSelectLabelFocus } from "./hooks/useSelectLabelFocus";
import { Login } from "./pages/Login";
import "@mattbutlerengineering/rialto/styles";

const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const FloorPlan = lazy(() =>
  import("./pages/FloorPlan").then((m) => ({ default: m.FloorPlan })),
);

function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--rialto-surface, #1e1c1a)",
      }}
      data-theme="dark"
    >
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--rialto-radius-soft, 10px)",
          background:
            "linear-gradient(135deg, var(--rialto-accent, #c49a2a) 0%, var(--rialto-accent-hover, #a07d1f) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      >
        <span
          style={{
            fontFamily: "var(--rialto-font-display, system-ui)",
            fontSize: "var(--rialto-text-sm, 14px)",
            fontWeight: 700,
            color: "var(--rialto-text-on-accent, #1a1918)",
            lineHeight: 1,
          }}
        >
          E
        </span>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

const skipLinkStyle: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  zIndex: 9999,
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 16px)",
  background: "var(--rialto-accent, #c49a2a)",
  color: "var(--rialto-text-on-accent, #1a1918)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: 600,
  textDecoration: "none",
  borderRadius: "var(--rialto-radius-default, 8px)",
};

const skipLinkFocusStyle = `
  .skip-link:focus {
    position: fixed !important;
    left: var(--rialto-space-md, 16px) !important;
    top: var(--rialto-space-md, 16px) !important;
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
  }
`;

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/floor-plan"
          element={
            user?.tenantId ? (
              <FloorPlan />
            ) : user ? (
              <Navigate to="/onboarding" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/"
          element={
            user?.tenantId ? (
              <Dashboard />
            ) : user ? (
              <Navigate to="/onboarding" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  useSelectLabelFocus();

  return (
    <BrowserRouter>
      <style>{skipLinkFocusStyle}</style>
      <a href="#main-content" className="skip-link" style={skipLinkStyle}>
        Skip to main content
      </a>
      <VenueThemeProvider theme={null}>
        <AppRoutes />
      </VenueThemeProvider>
    </BrowserRouter>
  );
}
