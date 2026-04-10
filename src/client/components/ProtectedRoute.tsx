import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, tenantId } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!tenantId) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}
