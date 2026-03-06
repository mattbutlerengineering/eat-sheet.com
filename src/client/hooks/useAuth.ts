import { useState, useEffect, useCallback } from "react";
import type { AuthState, Member, OAuthUser } from "../types";

const STORAGE_KEY = "eat-sheet-auth";

function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed.token || !parsed.member) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAuth(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Decode JWT payload without verification (server already verified)
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) return {};
  try {
    return JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth);
  const [loading, setLoading] = useState(true);
  const [pendingRegistration, setPendingRegistration] = useState<OAuthUser | null>(null);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const isRegister = params.get("register") === "true";

    if (token && !isRegister) {
      // Authenticated — token is a session JWT
      const payload = decodeJwtPayload(token);
      if (payload.member_id) {
        const state: AuthState = {
          token,
          member: {
            id: payload.member_id as string,
            family_id: payload.family_id as string,
            name: payload.name as string,
            is_admin: payload.is_admin as boolean,
          },
        };
        saveAuth(state);
        setAuth(state);
        window.history.replaceState({}, "", "/");
        setLoading(false);
        return;
      }
    }

    if (token && isRegister) {
      // Registration needed — token is a temp registration JWT
      const payload = decodeJwtPayload(token);
      if (payload.oauth_provider) {
        setPendingRegistration({
          oauth_provider: payload.oauth_provider as string,
          oauth_id: payload.oauth_id as string,
          email: payload.email as string,
          name: payload.name as string,
        });
        setRegistrationToken(token);
        window.history.replaceState({}, "", "/");
      }
      setLoading(false);
      return;
    }

    // Normal load — validate stored auth
    const stored = loadAuth();
    if (!stored) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json() as Promise<{ data: Member }>;
      })
      .then((json) => {
        const verified: AuthState = { token: stored.token, member: json.data };
        saveAuth(verified);
        setAuth(verified);
      })
      .catch(() => {
        clearAuth();
        setAuth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (inviteCode: string, name: string, regToken: string) => {
    const res = await fetch("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invite_code: inviteCode,
        name,
        registration_token: regToken,
      }),
    });

    const json = (await res.json()) as { data?: { token: string; member: Member }; error?: string };

    if (!res.ok || !json.data) {
      throw new Error(json.error || "Failed to join");
    }

    const state: AuthState = { token: json.data.token, member: json.data.member };
    saveAuth(state);
    setAuth(state);
    setPendingRegistration(null);
    setRegistrationToken(null);
    return state;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
    setPendingRegistration(null);
    setRegistrationToken(null);
  }, []);

  const updateName = useCallback((name: string) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const updated: AuthState = { ...prev, member: { ...prev.member, name } };
      saveAuth(updated);
      return updated;
    });
  }, []);

  return { auth, loading, logout, updateName, register, pendingRegistration, registrationToken };
}
