import { useState, useCallback } from "react";
import type { GoogleAuthResult, GoogleUser, Member, AuthState } from "../types";

interface UseGoogleAuthReturn {
  readonly loading: boolean;
  readonly error: string | null;
  readonly googleUser: GoogleUser | null;
  readonly signInWithGoogle: (idToken: string) => Promise<GoogleAuthResult>;
  readonly registerWithGoogle: (
    inviteCode: string,
    name: string,
    googleUser: GoogleUser
  ) => Promise<AuthState>;
  readonly clearError: () => void;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const signInWithGoogle = useCallback(async (idToken: string): Promise<GoogleAuthResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });

      const json = (await res.json()) as { data?: GoogleAuthResult; error?: string };

      if (!res.ok || !json.data) {
        throw new Error(json.error || "Google sign-in failed");
      }

      if (json.data.status === "needs_registration" && json.data.google_user) {
        setGoogleUser(json.data.google_user);
      }

      return json.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerWithGoogle = useCallback(
    async (inviteCode: string, name: string, gUser: GoogleUser): Promise<AuthState> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invite_code: inviteCode,
            name,
            google_id: gUser.google_id,
            email: gUser.email,
          }),
        });

        const json = (await res.json()) as {
          data?: { token: string; member: Member };
          error?: string;
        };

        if (!res.ok || !json.data) {
          throw new Error(json.error || "Failed to join");
        }

        return { token: json.data.token, member: json.data.member };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, googleUser, signInWithGoogle, registerWithGoogle, clearError };
}
