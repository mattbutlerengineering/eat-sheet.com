import { useState } from "react";

interface JoinScreenProps {
  readonly onJoin: (inviteCode: string, name: string) => Promise<unknown>;
}

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
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-stone-950">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="text-center mb-12 animate-fade-up">
          <h1 className="font-display text-5xl font-black text-orange-500 tracking-tight">
            eat sheet
          </h1>
          <p className="mt-2 text-stone-400 font-body text-sm tracking-widest uppercase">
            Family Restaurant Ratings
          </p>
        </div>

        {/* Join Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div>
            <label htmlFor="invite-code" className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter your family code"
              autoComplete="off"
              className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              autoComplete="name"
              className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !inviteCode.trim() || !name.trim()}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            {submitting ? "Joining..." : "Join the Sheet"}
          </button>
        </form>

        <p
          className="text-center text-stone-600 text-xs mt-8 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          Ask your family for the invite code
        </p>
      </div>
    </div>
  );
}
