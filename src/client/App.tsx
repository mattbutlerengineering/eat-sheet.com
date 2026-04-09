import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FloorPlan = lazy(() => import('./pages/FloorPlan'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Waitlist = lazy(() => import('./pages/Waitlist'));
const Guests = lazy(() => import('./pages/Guests'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="floor-plan" element={<FloorPlan />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="waitlist" element={<Waitlist />} />
            <Route path="guests" element={<Guests />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
