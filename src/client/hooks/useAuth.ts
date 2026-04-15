import { useState, useEffect } from "react";
import type { AuthUser } from "@shared/types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json() as { data: AuthUser };
          setState({ user: body.data, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      })
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return state;
}
