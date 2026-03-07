import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { JoinScreen } from "./components/JoinScreen";
import { OfflineBanner } from "./components/OfflineBanner";
import { InstallPrompt } from "./components/InstallPrompt";
import { BottomNav } from "./components/BottomNav";
import { OnboardingFlow, isOnboarded } from "./components/OnboardingFlow";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageViewTracker } from "./components/PageViewTracker";
import { Monster } from "./components/Monster";
import { randomLoadingMessage } from "./utils/personality";
import { identifyUser, resetUser } from "./utils/analytics";

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
const FamilyStats = lazy(() =>
  import("./components/FamilyStats").then((m) => ({ default: m.FamilyStats }))
);
const ProfilePage = lazy(() =>
  import("./components/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const DiscoverPage = lazy(() =>
  import("./components/DiscoverPage").then((m) => ({ default: m.DiscoverPage }))
);
const SharePage = lazy(() =>
  import("./components/SharePage").then((m) => ({ default: m.SharePage }))
);
const GroupsPage = lazy(() =>
  import("./components/GroupsPage").then((m) => ({ default: m.GroupsPage }))
);
const ImportRestaurants = lazy(() =>
  import("./components/ImportRestaurants").then((m) => ({ default: m.ImportRestaurants }))
);
const InviteHandler = lazy(() =>
  import("./components/InviteHandler").then((m) => ({ default: m.InviteHandler }))
);

function PageLoader() {
  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-3" role="status">
      <Monster variant="party" size={40} />
      <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
    </div>
  );
}

// Share pages are public — accessible without auth
function PublicRoutes() {
  // Check if current path is a share link
  if (window.location.pathname.startsWith("/share/")) {
    return (
      <BrowserRouter>
        <PageViewTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/share/:type/:token" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }
  return null;
}

export function App() {
  const { auth, loading, logout, updateName, register, pendingRegistration, registrationToken } = useAuth();

  useEffect(() => {
    if (auth) {
      identifyUser(auth.member.id, auth.member.name);
    } else {
      resetUser();
    }
  }, [auth]);

  // Public share pages don't need auth
  if (!auth && window.location.pathname.startsWith("/share/")) {
    return (
      <ErrorBoundary>
        <PublicRoutes />
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4" role="status" aria-label="Loading application">
        <Monster variant="party" size={56} />
        <h1 className="font-display text-3xl font-black text-coral-500 animate-pulse">
          eat sheet
        </h1>
        <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
      </div>
    );
  }

  if (!auth) {
    return (
      <JoinScreen
        pendingRegistration={pendingRegistration}
        registrationToken={registrationToken}
        onRegister={register}
      />
    );
  }

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <PageViewTracker />
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
                  : <RestaurantList token={auth.token} member={auth.member} />
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
              path="/import"
              element={<ImportRestaurants token={auth.token} />}
            />
            <Route
              path="/discover"
              element={<DiscoverPage token={auth.token} />}
            />
            <Route
              path="/groups"
              element={<GroupsPage token={auth.token} />}
            />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  token={auth.token}
                  member={auth.member}
                  onLogout={logout}
                  onNameChange={updateName}
                />
              }
            />
            <Route
              path="/stats"
              element={<FamilyStats token={auth.token} />}
            />
            <Route
              path="/invite/:code"
              element={<InviteHandler token={auth.token} />}
            />
            <Route path="/share/:type/:token" element={<SharePage />} />
            {/* Redirects for old routes */}
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
            <Route path="/activity" element={<Navigate to="/discover" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </BrowserRouter>
    </ErrorBoundary>
  );
}
