import { useState, useCallback, useMemo } from 'react';

interface JwtPayload {
  userId?: string;
  tenantId?: string;
  permissions?: string[];
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1])) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));

  const decoded = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const login = useCallback((newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
  }, []);

  return {
    token,
    isAuthenticated: !!token && !!decoded && (decoded.exp ?? 0) > Date.now() / 1000,
    userId: decoded?.userId ?? null,
    tenantId: decoded?.tenantId ?? null,
    permissions: decoded?.permissions ?? [],
    login,
    logout,
  };
}
