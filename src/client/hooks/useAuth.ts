import { useState, useEffect, useCallback } from "react";
import type { AuthState, Member } from "../types";

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

export function useAuth() {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const join = useCallback(async (inviteCode: string, name: string) => {
    const res = await fetch("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: inviteCode, name }),
    });

    const json = (await res.json()) as { data?: { token: string; member: Member }; error?: string };

    if (!res.ok || !json.data) {
      throw new Error(json.error || "Failed to join");
    }

    const state: AuthState = { token: json.data.token, member: json.data.member };
    saveAuth(state);
    setAuth(state);
    return state;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
  }, []);

  return { auth, loading, join, logout };
}
