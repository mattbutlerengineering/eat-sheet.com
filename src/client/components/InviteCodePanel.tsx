import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";

interface InviteCodePanelProps {
  readonly token: string;
  readonly onClose: () => void;
}

export function InviteCodePanel({ token, onClose }: InviteCodePanelProps) {
  const { get, post } = useApi(token);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useEffect(() => {
    get<{ invite_code: string }>("/api/auth/invite-code")
      .then((data) => setCode(data.invite_code))
      .finally(() => setLoading(false));
  }, [get]);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setConfirmRegen(false);
    setLoading(true);
    const data = await post<{ invite_code: string }>("/api/auth/regenerate-code", {});
    setCode(data.invite_code);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-stone-900 border-t border-stone-700 rounded-t-2xl p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-stone-50">Invite Code</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">
            Close
          </button>
        </div>

        {loading ? (
          <div className="shimmer h-12 rounded-xl" />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <code className="flex-1 bg-stone-800 text-orange-400 font-mono text-xl font-bold text-center py-3 rounded-xl tracking-widest">
                {code}
              </code>
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Share this code with family members so they can join.
            </p>

            {confirmRegen ? (
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Confirm Regenerate
                </button>
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="flex-1 py-2.5 bg-stone-800 text-stone-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRegen(true)}
                className="w-full text-xs text-stone-500 hover:text-red-400 transition-colors py-2"
              >
                Regenerate code (invalidates current code)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
