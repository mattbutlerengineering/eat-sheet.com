import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { JoinScreen } from "./components/JoinScreen";
import { RestaurantList } from "./components/RestaurantList";
import { RestaurantDetail } from "./components/RestaurantDetail";
import { AddRestaurant } from "./components/AddRestaurant";
import { OfflineBanner } from "./components/OfflineBanner";

export function App() {
  const { auth, loading, join, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex items-center justify-center">
        <h1 className="font-display text-3xl font-black text-orange-500 animate-pulse">
          eat sheet
        </h1>
      </div>
    );
  }

  if (!auth) {
    return <JoinScreen onJoin={join} />;
  }

  return (
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        <Route
          path="/"
          element={
            <RestaurantList token={auth.token} member={auth.member} onLogout={logout} />
          }
        />
        <Route
          path="/restaurant/:id"
          element={<RestaurantDetail token={auth.token} member={auth.member} />}
        />
        <Route
          path="/add"
          element={<AddRestaurant token={auth.token} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
