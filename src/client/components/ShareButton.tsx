import { useState } from "react";
import { useApi } from "../hooks/useApi";

interface ShareButtonProps {
  readonly token: string;
  readonly type: "restaurant" | "review";
  readonly id: string;
  readonly name: string;
}

export function ShareButton({ token, type, id, name }: ShareButtonProps) {
  const { post } = useApi(token);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      const result = await post<{ share_token: string }>(`/api/share/${type}/${id}`, {});
      const url = `${window.location.origin}/share/${type}/${result.share_token}`;

      // Try native share API first
      if (navigator.share) {
        await navigator.share({
          title: `${name} — Eat Sheet`,
          text: `Check out ${name} on Eat Sheet!`,
          url,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share or copy failed
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      aria-label={`Share ${name}`}
      className="p-1.5 text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
    >
      {copied ? (
        <span className="text-green-500 text-xs font-medium">Copied!</span>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </button>
  );
}
