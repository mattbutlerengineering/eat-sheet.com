import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { Monster } from "./Monster";

interface InviteHandlerProps {
  readonly token: string;
}

export function InviteHandler({ token }: InviteHandlerProps) {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { post } = useApi(token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    post<{ id: string; name: string }>("/api/groups/join", { invite_code: code })
      .then(() => navigate("/groups", { replace: true }))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to join group");
      });
  }, [code, post, navigate]);

  if (error) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4 px-6">
        <Monster variant="snarky" size={56} />
        <p className="text-stone-300 font-display font-bold text-lg text-center">
          Couldn't join group
        </p>
        <p className="text-red-400 text-sm text-center">{error}</p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="mt-4 bg-coral-500 hover:bg-coral-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl active:scale-95 transition-all"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4">
      <Monster variant="party" size={48} />
      <p className="text-stone-500 text-sm italic">Joining group...</p>
    </div>
  );
}
