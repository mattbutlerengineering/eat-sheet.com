import { useState } from "react";
import { Slurms } from "./Slurms";
import { SLURMS_QUOTES } from "../utils/personality";

interface JoinScreenProps {
  readonly onJoin: (inviteCode: string, name: string) => Promise<unknown>;
}

const FLOATING_FOOD = [
  { emoji: "🍕", top: "8%", left: "10%", delay: "0s", duration: "6s" },
  { emoji: "🍣", top: "15%", right: "12%", delay: "1.5s", duration: "7s" },
  { emoji: "🌮", bottom: "20%", left: "8%", delay: "3s", duration: "5.5s" },
  { emoji: "🍷", bottom: "12%", right: "10%", delay: "0.8s", duration: "6.5s" },
] as const;

export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      {/* Floating food emoji */}
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

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / Branding */}
        <div className="text-center mb-10 animate-fade-up">
          <h1 className="font-display text-6xl font-black text-orange-500 tracking-tight italic">
            eat sheet
          </h1>
          <p className="mt-3 text-stone-400 font-body text-sm tracking-widest uppercase">
            Your family's brutally honest restaurant guide
          </p>
        </div>

        {/* Slurms welcome */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <Slurms variant="welcome" size={48} />
          <p className="text-stone-400 text-sm italic font-display">
            {SLURMS_QUOTES.welcome}
          </p>
        </div>

        {/* Join Form */}
        <form
          onSubmit={handleSubmit}
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
              className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 focus:shadow-[0_0_12px_rgba(249,115,22,0.15)] transition-all"
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
              className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 focus:shadow-[0_0_12px_rgba(249,115,22,0.15)] transition-all"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !inviteCode.trim() || !name.trim()}
            className="btn-shimmer w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            {submitting ? "Joining..." : "Join the Sheet"}
          </button>
        </form>

        <p
          className="text-center text-stone-600 text-sm mt-8 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          Ask your family for the invite code
        </p>
      </div>
    </div>
  );
}
