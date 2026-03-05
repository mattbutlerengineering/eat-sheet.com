import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { JoinScreen } from "./components/JoinScreen";
import { RestaurantList } from "./components/RestaurantList";
import { RestaurantDetail } from "./components/RestaurantDetail";
import { AddRestaurant } from "./components/AddRestaurant";
import { OfflineBanner } from "./components/OfflineBanner";
import { InstallPrompt } from "./components/InstallPrompt";
import { BottomNav } from "./components/BottomNav";
import { ActivityFeed } from "./components/ActivityFeed";
import { FamilyStats } from "./components/FamilyStats";
import { SettingsPage } from "./components/SettingsPage";
import { Slurms } from "./components/Slurms";
import { randomLoadingMessage } from "./utils/personality";

export function App() {
  const { auth, loading, join, logout, updateName } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4">
        <Slurms variant="party" size={56} />
        <h1 className="font-display text-3xl font-black text-orange-500 animate-pulse">
          eat sheet
        </h1>
        <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
      </div>
    );
  }

  if (!auth) {
    return <JoinScreen onJoin={join} />;
  }

  return (
    <BrowserRouter>
      <OfflineBanner />
      <InstallPrompt />
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
        <Route
          path="/activity"
          element={<ActivityFeed token={auth.token} />}
        />
        <Route
          path="/stats"
          element={<FamilyStats token={auth.token} />}
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              token={auth.token}
              member={auth.member}
              onLogout={logout}
              onNameChange={updateName}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
