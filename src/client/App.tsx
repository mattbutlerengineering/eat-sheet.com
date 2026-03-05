import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { JoinScreen } from "./components/JoinScreen";
import { OfflineBanner } from "./components/OfflineBanner";
import { InstallPrompt } from "./components/InstallPrompt";
import { BottomNav } from "./components/BottomNav";
import { OnboardingFlow, isOnboarded } from "./components/OnboardingFlow";
import { Slurms } from "./components/Slurms";
import { randomLoadingMessage } from "./utils/personality";

// Code-split route components
const RestaurantList = lazy(() =>
  import("./components/RestaurantList").then((m) => ({ default: m.RestaurantList }))
);
const RestaurantDetail = lazy(() =>
  import("./components/RestaurantDetail").then((m) => ({ default: m.RestaurantDetail }))
);
const AddRestaurant = lazy(() =>
  import("./components/AddRestaurant").then((m) => ({ default: m.AddRestaurant }))
);
const ActivityFeed = lazy(() =>
  import("./components/ActivityFeed").then((m) => ({ default: m.ActivityFeed }))
);
const FamilyStats = lazy(() =>
  import("./components/FamilyStats").then((m) => ({ default: m.FamilyStats }))
);
const SettingsPage = lazy(() =>
  import("./components/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const SharePage = lazy(() =>
  import("./components/SharePage").then((m) => ({ default: m.SharePage }))
);

function PageLoader() {
  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-3" role="status">
      <Slurms variant="party" size={40} />
      <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
    </div>
  );
}

export function App() {
  const { auth, loading, join, logout, updateName } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4" role="status" aria-label="Loading application">
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
      <main className="pb-16">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                !isOnboarded()
                  ? <Navigate to="/onboarding" replace />
                  : <RestaurantList token={auth.token} member={auth.member} onLogout={logout} />
              }
            />
            <Route path="/onboarding" element={<OnboardingFlow />} />
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
            <Route path="/share/:type/:token" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </BrowserRouter>
  );
}
