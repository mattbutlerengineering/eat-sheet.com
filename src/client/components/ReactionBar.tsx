import { useState } from "react";
import { useApi } from "../hooks/useApi";
import type { Reaction } from "../types";

interface ReactionBarProps {
  readonly token: string;
  readonly reviewId: string;
  readonly memberId: string;
  readonly reactions: readonly Reaction[];
  readonly onReacted: () => void;
}

const EMOJI_MAP: Record<string, string> = {
  fire: "🔥",
  heart: "❤️",
  laughing: "😂",
  "100": "💯",
  thumbsup: "👍",
};

const EMOJI_LABELS: Record<string, string> = {
  fire: "Fire reaction",
  heart: "Love reaction",
  laughing: "Funny reaction",
  "100": "Perfect reaction",
  thumbsup: "Thumbs up reaction",
};

const EMOJI_KEYS = ["fire", "heart", "laughing", "100", "thumbsup"] as const;

export function ReactionBar({ token, reviewId, memberId, reactions, onReacted }: ReactionBarProps) {
  const { post } = useApi(token);
  const [animating, setAnimating] = useState<string | null>(null);

  const myReaction = reactions.find((r) => r.member_id === memberId)?.emoji ?? null;

  // Count reactions by emoji
  const counts = new Map<string, number>();
  for (const r of reactions) {
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  }

  const handleReact = async (emoji: string) => {
    setAnimating(emoji);
    try {
      await post(`/api/reactions/${reviewId}`, { emoji });
      onReacted();
    } catch {
      // silently fail — not critical
    } finally {
      setTimeout(() => setAnimating(null), 300);
    }
  };

  return (
    <div className="flex gap-1.5 mt-3 flex-wrap">
      {EMOJI_KEYS.map((key) => {
        const count = counts.get(key) ?? 0;
        const isActive = myReaction === key;
        const isPop = animating === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => handleReact(key)}
            aria-label={`${EMOJI_LABELS[key]}${count > 0 ? `, ${count}` : ""}${isActive ? " (your reaction)" : ""}`}
            aria-pressed={isActive}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
              isActive
                ? "bg-orange-500/20 border border-orange-500/40"
                : "bg-stone-800/60 border border-stone-700/50 hover:border-stone-600"
            } ${isPop ? "score-pop" : ""}`}
          >
            <span className="text-sm">{EMOJI_MAP[key]}</span>
            {count > 0 && (
              <span className={`font-medium ${isActive ? "text-orange-400" : "text-stone-400"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
