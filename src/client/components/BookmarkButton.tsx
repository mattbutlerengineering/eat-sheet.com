import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { track } from "../utils/analytics";

interface BookmarkButtonProps {
  readonly token: string;
  readonly restaurantId: string;
  readonly isBookmarked: boolean;
  readonly onToggled: () => void;
}

export function BookmarkButton({ token, restaurantId, isBookmarked, onToggled }: BookmarkButtonProps) {
  const { post } = useApi(token);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const displayBookmarked = optimisticState ?? isBookmarked;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (optimisticState !== null) return;

    const newState = !isBookmarked;
    setOptimisticState(newState);
    setErrorMsg("");

    try {
      await post(`/api/bookmarks/${restaurantId}`, {});
      track("bookmark_toggled", { restaurant_id: restaurantId, action: isBookmarked ? "removed" : "added" });
      setOptimisticState(null);
      onToggled();
    } catch {
      setOptimisticState(null);
      setErrorMsg("Couldn't update bookmark");
      setTimeout(() => setErrorMsg(""), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={optimisticState !== null}
      style={{ position: "relative" }}
      aria-label={displayBookmarked ? "Remove from Want to Try" : "Add to Want to Try"}
      aria-pressed={displayBookmarked}
      className={`p-1.5 rounded-lg transition-all ${
        displayBookmarked
          ? "text-coral-500 hover:text-coral-600"
          : "text-stone-500 hover:text-stone-300"
      } ${optimisticState !== null ? "opacity-50" : ""}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={displayBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
      {errorMsg && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-red-400 bg-stone-900 px-2 py-1 rounded shadow">
          {errorMsg}
        </span>
      )}
    </button>
  );
}
