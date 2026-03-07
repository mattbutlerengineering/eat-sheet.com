import { useState } from "react";
import { Monster } from "./Monster";
import { OAuthButton } from "./OAuthButton";
import { CHOMPS_QUOTES } from "../utils/personality";
import type { OAuthUser } from "../types";

interface JoinScreenProps {
  readonly pendingRegistration: OAuthUser | null;
  readonly registrationToken: string | null;
  readonly onRegister: (inviteCode: string | undefined, registrationToken: string) => Promise<unknown>;
}

const FLOATING_FOOD = [
  { emoji: "\u{1F355}", top: "8%", left: "10%", delay: "0s", duration: "6s" },
  { emoji: "\u{1F363}", top: "15%", right: "12%", delay: "1.5s", duration: "7s" },
  { emoji: "\u{1F32E}", bottom: "20%", left: "8%", delay: "3s", duration: "5.5s" },
  { emoji: "\u{1F377}", bottom: "12%", right: "10%", delay: "0.8s", duration: "6.5s" },
] as const;

const INPUT_CLASS =
  "w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/50 focus:shadow-[0_0_12px_rgba(232,131,110,0.15)] transition-all";

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
        <h1 className="font-display text-6xl font-black text-coral-500 tracking-tight italic">
          eat sheet
        </h1>
        <p className="mt-3 text-stone-400 font-body text-sm tracking-widest uppercase">
          Your brutally honest restaurant guide
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 mb-8 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <Monster variant="welcome" size={48} />
        <p className="text-stone-400 text-sm italic font-display">
          {CHOMPS_QUOTES.welcome}
        </p>
      </div>
    </>
  );
}

export function JoinScreen({ pendingRegistration, registrationToken, onRegister }: JoinScreenProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationToken) return;

    setError("");
    setSubmitting(true);
    try {
      const code = inviteCode.trim() || undefined;
      await onRegister(code, registrationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSolo = async () => {
    if (!registrationToken) return;

    setError("");
    setSubmitting(true);
    try {
      await onRegister(undefined, registrationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-stone-950 relative overflow-hidden">
      <FloatingFood />

      <div className="w-full max-w-sm relative z-10">
        <Branding />

        {!pendingRegistration && (
          <div className="space-y-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <OAuthButton provider="google" />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <p className="text-center text-stone-600 text-sm mt-4">
              Have an invite code? Sign in first, then enter it
            </p>
          </div>
        )}

        {pendingRegistration && (
          <form
            onSubmit={handleRegisterSubmit}
            className="space-y-5 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="bg-stone-900 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-coral-500/20 flex items-center justify-center text-coral-500 font-bold text-lg">
                {pendingRegistration.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-stone-50 text-sm font-medium">{pendingRegistration.name}</p>
                <p className="text-stone-500 text-xs">{pendingRegistration.email}</p>
              </div>
            </div>

            <div>
              <label htmlFor="invite-code" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
                Invite Code <span className="text-stone-600 normal-case">(optional)</span>
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter a group invite code"
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !inviteCode.trim()}
              className="btn-shimmer w-full py-3.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              {submitting ? "Joining..." : "Join Group"}
            </button>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-stone-800" />
              <span className="text-stone-600 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-stone-800" />
            </div>

            <button
              type="button"
              onClick={handleStartSolo}
              disabled={submitting}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? "Setting up..." : "Start Solo"}
            </button>

            <p className="text-center text-stone-600 text-xs">
              You can create or join groups later from Settings
            </p>

            <a
              href="/"
              className="block w-full py-2 text-stone-500 hover:text-stone-300 text-sm transition-colors text-center"
            >
              Back
            </a>
          </form>
        )}

      </div>
    </div>
  );
}
