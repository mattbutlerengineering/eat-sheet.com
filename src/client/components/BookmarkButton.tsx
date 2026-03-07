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
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;

    setToggling(true);
    try {
      await post(`/api/bookmarks/${restaurantId}`, {});
      track("bookmark_toggled", { restaurant_id: restaurantId, action: isBookmarked ? "removed" : "added" });
      onToggled();
    } catch {
      // Non-critical — silently fail
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={toggling}
      aria-label={isBookmarked ? "Remove from Want to Try" : "Add to Want to Try"}
      aria-pressed={isBookmarked}
      className={`p-1.5 rounded-lg transition-all ${
        isBookmarked
          ? "text-coral-500 hover:text-coral-600"
          : "text-stone-500 hover:text-stone-300"
      } ${toggling ? "opacity-50" : ""}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    </button>
  );
}
