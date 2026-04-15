import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { VenueThemeProvider } from "./providers/VenueTheme";
import { useAuth } from "./hooks/useAuth";
import "@mattbutlerengineering/rialto/styles";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<div>Login</div>} />
      <Route
        path="/onboarding"
        element={user ? <div>Onboarding</div> : <Navigate to="/login" />}
      />
      <Route
        path="/"
        element={
          user?.tenantId ? (
            <div>Dashboard</div>
          ) : user ? (
            <Navigate to="/onboarding" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
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
