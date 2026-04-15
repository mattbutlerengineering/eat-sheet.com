import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { VenueThemeProvider } from "./providers/VenueTheme";
import { useAuth } from "./hooks/useAuth";
import { Login } from "./pages/Login";
import "@mattbutlerengineering/rialto/styles";

const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
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
  return (
    <BrowserRouter>
      <VenueThemeProvider theme={null}>
        <AppRoutes />
      </VenueThemeProvider>
    </BrowserRouter>
  );
}
