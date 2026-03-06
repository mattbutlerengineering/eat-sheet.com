import { useState, useCallback } from "react";
import { Slurms } from "./Slurms";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { SLURMS_QUOTES } from "../utils/personality";
import type { GoogleUser, GoogleAuthResult } from "../types";

interface JoinScreenProps {
  readonly onJoin: (inviteCode: string, name: string) => Promise<unknown>;
  readonly onGoogleAuth: (idToken: string) => Promise<GoogleAuthResult>;
  readonly onGoogleRegister: (inviteCode: string, name: string, googleUser: GoogleUser) => Promise<unknown>;
}

type ScreenState = "sign_in" | "register" | "invite_only";

const FLOATING_FOOD = [
  { emoji: "🍕", top: "8%", left: "10%", delay: "0s", duration: "6s" },
  { emoji: "🍣", top: "15%", right: "12%", delay: "1.5s", duration: "7s" },
  { emoji: "🌮", bottom: "20%", left: "8%", delay: "3s", duration: "5.5s" },
  { emoji: "🍷", bottom: "12%", right: "10%", delay: "0.8s", duration: "6.5s" },
] as const;

const INPUT_CLASS =
  "w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 focus:shadow-[0_0_12px_rgba(249,115,22,0.15)] transition-all";

function FloatingFood() {
  return (
    <>
      {FLOATING_FOOD.map((item) => (
        <span
          key={item.emoji}
          className="absolute text-3xl opacity-15 pointer-events-none animate-float"
          style={{
            top: "top" in item ? item.top : undefined,
            bottom: "bottom" in item ? item.bottom : undefined,
            left: "left" in item ? item.left : undefined,
            right: "right" in item ? item.right : undefined,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </>
  );
}

function Branding() {
  return (
    <>
      <div className="text-center mb-10 animate-fade-up">
        <h1 className="font-display text-6xl font-black text-orange-500 tracking-tight italic">
          eat sheet
        </h1>
        <p className="mt-3 text-stone-400 font-body text-sm tracking-widest uppercase">
          Your family's brutally honest restaurant guide
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 mb-8 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <Slurms variant="welcome" size={48} />
        <p className="text-stone-400 text-sm italic font-display">
          {SLURMS_QUOTES.welcome}
        </p>
      </div>
    </>
  );
}

export function JoinScreen({ onJoin, onGoogleAuth, onGoogleRegister }: JoinScreenProps) {
  const [screen, setScreen] = useState<ScreenState>("sign_in");
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleToken = useCallback(async (idToken: string) => {
    setError("");
    try {
      const result = await onGoogleAuth(idToken);
      if (result.status === "needs_registration" && result.google_user) {
        setGoogleUser(result.google_user);
        setName(result.google_user.name);
        setScreen("register");
      }
      // If "authenticated", useAuth already set the state — component will unmount
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }, [onGoogleAuth]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !name.trim() || !googleUser) return;

    setError("");
    setSubmitting(true);
    try {
      await onGoogleRegister(inviteCode.trim(), name.trim(), googleUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteOnlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !name.trim()) return;

    setError("");
    setSubmitting(true);
    try {
      await onJoin(inviteCode.trim(), name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-stone-950 relative overflow-hidden">
      <FloatingFood />

      <div className="w-full max-w-sm relative z-10">
        <Branding />

        {screen === "sign_in" && (
          <div className="space-y-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <GoogleSignInButton onToken={handleGoogleToken} />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-stone-800" />
              <span className="text-stone-600 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-stone-800" />
            </div>

            <button
              onClick={() => { setScreen("invite_only"); setError(""); }}
              className="w-full py-3 text-stone-400 hover:text-stone-200 text-sm transition-colors"
            >
              Use invite code only
            </button>

            <p className="text-center text-stone-600 text-sm mt-4">
              Ask your family for the invite code
            </p>
          </div>
        )}

        {screen === "register" && googleUser && (
          <form
            onSubmit={handleRegisterSubmit}
            className="space-y-5 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="bg-stone-900 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-lg">
                {googleUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-stone-50 text-sm font-medium">{googleUser.name}</p>
                <p className="text-stone-500 text-xs">{googleUser.email}</p>
              </div>
            </div>

            <div>
              <label htmlFor="invite-code" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter your family code"
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                autoComplete="name"
                className={INPUT_CLASS}
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !inviteCode.trim() || !name.trim()}
              className="btn-shimmer w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              {submitting ? "Joining..." : "Join the Sheet"}
            </button>

            <button
              type="button"
              onClick={() => { setScreen("sign_in"); setError(""); setGoogleUser(null); }}
              className="w-full py-2 text-stone-500 hover:text-stone-300 text-sm transition-colors"
            >
              Back
            </button>
          </form>
        )}

        {screen === "invite_only" && (
          <form
            onSubmit={handleInviteOnlySubmit}
            className="space-y-5 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div>
              <label htmlFor="invite-code" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter your family code"
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                autoComplete="name"
                className={INPUT_CLASS}
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !inviteCode.trim() || !name.trim()}
              className="btn-shimmer w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              {submitting ? "Joining..." : "Join the Sheet"}
            </button>

            <button
              type="button"
              onClick={() => { setScreen("sign_in"); setError(""); }}
              className="w-full py-2 text-stone-500 hover:text-stone-300 text-sm transition-colors"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
