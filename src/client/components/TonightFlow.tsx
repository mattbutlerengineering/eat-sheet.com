import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "../utils/analytics";
import { useApi } from "../hooks/useApi";
import { Monster } from "./Monster";
import { OverlayCloseButton, BounceDots } from "./OverlayParts";
import { CHOMPS_QUOTES, randomLoadingMessage } from "../utils/personality";
import { scoreBadgeColor } from "../utils/score";
import { cuisineLabel } from "../utils/cuisines";
import { BookmarkButton } from "./BookmarkButton";
import { TonightModeSelect } from "./TonightModeSelect";
import type { TonightMode } from "./TonightModeSelect";
import type { TonightSuggestion } from "../types";

interface TonightFlowProps {
  readonly token: string;
  readonly onClose: () => void;
}

type Phase = "mode_select" | "loading" | "suggestion" | "empty";

export function TonightFlow({ token, onClose }: TonightFlowProps) {
  const navigate = useNavigate();
  const { get } = useApi(token);
  const [phase, setPhase] = useState<Phase>("mode_select");
  const [suggestions, setSuggestions] = useState<readonly TonightSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingMessage] = useState(randomLoadingMessage);

  const handleModeSelect = useCallback(
    async (mode: TonightMode) => {
      track("tonight_mode_selected", { mode });
      setPhase("loading");
      try {
        const data = await get<readonly TonightSuggestion[]>(`/api/tonight?mode=${mode}`);
        if (data.length === 0) {
          setPhase("empty");
          return;
        }
        setSuggestions(data);
        setCurrentIndex(0);
        setPhase("suggestion");
      } catch {
        setPhase("empty");
      }
    },
    [get]
  );

  const handleNext = () => {
    if (current) track("tonight_suggestion_skipped", { restaurant_id: current.id });
    const nextIndex = currentIndex + 1;
    if (nextIndex >= suggestions.length) {
      setPhase("empty");
      return;
    }
    setCurrentIndex(nextIndex);
  };

  const handleBookmarkToggled = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, user_bookmarked: !s.user_bookmarked } : s
      )
    );
  };

  const handleStartOver = () => {
    setSuggestions([]);
    setCurrentIndex(0);
    setPhase("mode_select");
  };

  const current = suggestions[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
      <OverlayCloseButton onClick={onClose} />

      {/* Title */}
      <div className="flex items-center gap-2 mb-8">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-500">
          <path d="M12 2c1 3 4 6 4 10a4 4 0 01-8 0c0-4 3-7 4-10z" />
        </svg>
        <h2 className="font-display font-black text-xl text-coral-500 italic">Tonight</h2>
      </div>

      {/* Phase: Mode Select */}
      {phase === "mode_select" && <TonightModeSelect onSelect={handleModeSelect} />}

      {/* Phase: Loading */}
      {phase === "loading" && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
          <Monster variant="party" size={56} />
          <p className="text-stone-500 text-sm italic">{loadingMessage}</p>
          <BounceDots />
        </div>
      )}

      {/* Phase: Suggestion */}
      {phase === "suggestion" && current && (
        <div role="status" aria-live="polite" className="w-full max-w-sm animate-fade-up">
          <p className="text-center text-stone-500 text-sm mb-4">
            {currentIndex + 1} of {suggestions.length}
          </p>

          <div className="bg-stone-900 border border-stone-800/50 rounded-2xl p-6 text-center">
            {current.photo_url && (
              <img
                src={current.photo_url}
                alt=""
                className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 ring-2 ring-coral-500/30"
              />
            )}

            <h3 className="font-display font-black text-2xl text-stone-50">
              {current.name}
            </h3>

            {current.cuisine && (
              <p className="text-coral-500/80 font-medium mt-1">{cuisineLabel(current.cuisine)}</p>
            )}

            {current.address && (
              <p className="text-stone-500 text-sm mt-1">{current.address}</p>
            )}

            {current.avg_score !== null && (
              <div className={`mt-4 inline-flex px-3 py-1.5 rounded-lg font-display font-black text-xl ${scoreBadgeColor(current.avg_score)}`}>
                {current.avg_score.toFixed(1)}
              </div>
            )}

            <p className="text-stone-400 text-sm mt-3 italic">{current.reason}</p>

            <div className="flex items-center justify-center gap-2 mt-4">
              <Monster variant="celebrate" size={32} />
              <span className="text-stone-400 text-sm italic font-display">
                {CHOMPS_QUOTES.pickerWin}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={handleNext}
              className="px-5 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-colors active:scale-[0.98]"
            >
              Next
            </button>
            <BookmarkButton
              token={token}
              restaurantId={current.id}
              isBookmarked={current.user_bookmarked}
              onToggled={() => handleBookmarkToggled(current.id)}
            />
            <button
              onClick={() => { track("tonight_suggestion_accepted", { restaurant_id: current.id }); navigate(`/restaurant/${current.id}`); }}
              className="px-5 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-coral-500/25"
            >
              Let's go!
            </button>
          </div>
        </div>
      )}

      {/* Phase: Empty / Exhausted */}
      {phase === "empty" && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 animate-fade-up">
          <Monster variant="bored" size={56} />
          <p className="text-stone-300 font-display font-bold text-lg text-center">
            {suggestions.length > 0 ? "That's all we've got!" : CHOMPS_QUOTES.empty}
          </p>
          <p className="text-stone-500 text-sm text-center">
            {suggestions.length > 0
              ? "You've seen all the suggestions"
              : "No suggestions found for this mode"}
          </p>
          <button
            onClick={handleStartOver}
            className="mt-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-colors active:scale-[0.98]"
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
