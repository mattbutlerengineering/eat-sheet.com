import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Restaurant } from "../types";
import { track } from "../utils/analytics";
import { useApi } from "../hooks/useApi";
import { OverlayCloseButton } from "./OverlayParts";
import { Monster } from "./Monster";
import { CHOMPS_QUOTES } from "../utils/personality";
import { cuisineEmoji, cuisineLabel } from "../utils/cuisines";
import { scoreBadgeColor, scoreDisplay } from "../utils/score";

interface SizzleFlowProps {
  readonly restaurants: readonly Restaurant[];
  readonly token: string;
  readonly bookmarkedIds: ReadonlySet<string>;
  readonly onClose: () => void;
}

type Verdict = "sizzle" | "fizzle";

interface SwipeState {
  readonly offsetX: number;
  readonly isDragging: boolean;
}

const STAMP_STYLES: Record<Verdict, React.CSSProperties> = {
  sizzle: { "--stamp-rotate": "15deg", color: "var(--color-green-500)", borderColor: "var(--color-green-500)" } as React.CSSProperties,
  fizzle: { "--stamp-rotate": "-15deg", color: "var(--color-red-500)", borderColor: "var(--color-red-500)" } as React.CSSProperties,
};

function shuffleArray<T>(arr: readonly T[]): readonly T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function SizzleFlow({ restaurants, token, bookmarkedIds, onClose }: SizzleFlowProps) {
  const { post } = useApi(token);

  // Shuffle and exclude already-bookmarked restaurants
  const stack = useMemo(
    () => shuffleArray(restaurants.filter((r) => !bookmarkedIds.has(r.id))),
    [restaurants, bookmarkedIds]
  );

  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [swipe, setSwipe] = useState<SwipeState>({ offsetX: 0, isDragging: false });
  const [exiting, setExiting] = useState(false);

  const startRef = useRef({ x: 0, time: 0 });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const current = index < stack.length ? stack[index]! : null;
  const isEmpty = current === null;

  // Lock body scroll while overlay is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Clean up animation timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const handleClose = useCallback(() => {
    track("feature_closed", { feature: "sizzle", cards_swiped: index });
    onClose();
  }, [index, onClose]);

  const advanceCard = useCallback(() => {
    setVerdict(null);
    setExiting(false);
    setSwipe({ offsetX: 0, isDragging: false });
    setIndex((i) => i + 1);
  }, []);

  const handleVerdict = useCallback(
    (v: Verdict) => {
      if (verdict || exiting || !current) return;

      // Bookmark on sizzle
      if (v === "sizzle") {
        post(`/api/bookmarks/${current.id}`, {}).catch(() => {});
      }

      track("sizzle_swipe", { verdict: v, restaurant_id: current.id, index, total: stack.length });
      setVerdict(v);

      // Show stamp, then advance
      const t1 = setTimeout(() => {
        setExiting(true);
        const t2 = setTimeout(advanceCard, 350);
        timersRef.current.push(t2);
      }, 400);
      timersRef.current.push(t1);
    },
    [verdict, exiting, current, post, advanceCard]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (verdict || exiting || isEmpty) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleVerdict("sizzle");
      if (e.key === "ArrowLeft") handleVerdict("fizzle");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [verdict, exiting, isEmpty, onClose, handleVerdict]);

  // --- Touch handlers ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (verdict || exiting) return;
    startRef.current = { x: e.clientX, time: Date.now() };
    setSwipe({ offsetX: 0, isDragging: true });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipe.isDragging || verdict || exiting) return;
    const dx = e.clientX - startRef.current.x;
    setSwipe({ offsetX: dx, isDragging: true });
  };

  const handlePointerUp = () => {
    if (!swipe.isDragging || verdict || exiting) return;
    const elapsed = Date.now() - startRef.current.time;
    const velocity = Math.abs(swipe.offsetX) / Math.max(elapsed, 1);
    const MIN_DISPLACEMENT = 50;
    const MIN_VELOCITY = 0.3;

    if (
      Math.abs(swipe.offsetX) > MIN_DISPLACEMENT ||
      velocity > MIN_VELOCITY
    ) {
      handleVerdict(swipe.offsetX > 0 ? "sizzle" : "fizzle");
    }

    // Snap back if not enough
    setSwipe({ offsetX: 0, isDragging: false });
  };

  // --- Card transform ---
  const rotation = Math.max(-15, Math.min(15, swipe.offsetX * 0.1));
  const dragProgress = Math.min(1, Math.abs(swipe.offsetX) / 150);

  const cardStyle = exiting
    ? {
        transform: `translateX(${verdict === "sizzle" ? "150vw" : "-150vw"}) rotate(${verdict === "sizzle" ? 15 : -15}deg)`,
        transition: "transform 0.35s ease-in",
      }
    : swipe.isDragging
      ? {
          transform: `translateX(${swipe.offsetX}px) rotate(${rotation}deg)`,
          transition: "none",
        }
      : {
          transform: "translateX(0) rotate(0deg)",
          transition: "transform 0.3s ease-out",
        };

  // --- Directional color overlay ---
  const sizzleOpacity = swipe.offsetX > 0 ? dragProgress * 0.4 : 0;
  const fizzleOpacity = swipe.offsetX < 0 ? dragProgress * 0.4 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 flex flex-col items-center justify-center animate-slide-up">
      <OverlayCloseButton onClick={handleClose} />

      {/* Title */}
      <h2 className="font-display text-2xl font-black text-coral-500 italic mb-6">
        Sizzle or Fizzle
      </h2>

      {isEmpty ? (
        /* Empty state */
        <div className="text-center px-6 animate-fade-up">
          <Monster variant="party" size={64} className="mx-auto" />
          <p className="text-stone-300 font-display font-bold text-lg mt-4">
            {CHOMPS_QUOTES.allDone}
          </p>
          <p className="text-stone-500 text-sm mt-2">
            You've swiped through every restaurant!
          </p>
          <button
            onClick={handleClose}
            className="mt-6 bg-coral-500 hover:bg-coral-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl active:scale-95 transition-all"
          >
            Back to Eats
          </button>
        </div>
      ) : (
        <>
          {/* Card */}
          <div className="relative w-[min(85vw,360px)]">
            <div
              key={index}
              className={`relative bg-stone-900 border border-stone-800/50 rounded-2xl overflow-hidden shadow-2xl select-none touch-none ${!exiting && !verdict ? "animate-card-enter" : ""}`}
              style={cardStyle}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Hero image or emoji fallback */}
              <div className="relative h-56 bg-stone-800 hero-gradient">
                {current.photo_url ? (
                  <img
                    src={current.photo_url}
                    alt={current.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {cuisineEmoji(current.cuisine)}
                  </div>
                )}

                {/* Directional color overlays */}
                <div
                  className="absolute inset-0 bg-green-500 pointer-events-none"
                  style={{ opacity: sizzleOpacity }}
                />
                <div
                  className="absolute inset-0 bg-red-500 pointer-events-none"
                  style={{ opacity: fizzleOpacity }}
                />
              </div>

              {/* Card body */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-2xl text-stone-50 truncate">
                      {current.name}
                    </h3>
                    {current.cuisine && (
                      <span className="inline-block mt-1 text-sm text-stone-400">
                        {cuisineLabel(current.cuisine)}
                      </span>
                    )}
                    {current.address && (
                      <p className="text-xs text-stone-500 mt-1 truncate">
                        {current.address}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg font-display font-black text-lg ${scoreBadgeColor(current.avg_score)}`}
                  >
                    {scoreDisplay(current.avg_score)}
                  </div>
                </div>
              </div>

              {/* Stamp overlay */}
              {verdict && !exiting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="animate-stamp-pop px-6 py-3 border-4 rounded-lg text-4xl font-display font-black uppercase tracking-wider"
                    style={STAMP_STYLES[verdict]}
                  >
                    {verdict === "sizzle" ? "SIZZLE" : "FIZZLE"}
                  </div>
                </div>
              )}
            </div>

            {/* Remaining count */}
            <p className="text-center text-stone-500 text-xs mt-3">
              {index + 1} of {stack.length} &middot; {stack.length - index - 1} remaining
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-8 mt-6">
            <button
              onClick={() => handleVerdict("fizzle")}
              disabled={!!verdict || exiting}
              className="w-16 h-16 rounded-full bg-stone-800 border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 active:scale-90 transition-all flex items-center justify-center disabled:opacity-50"
              aria-label="Fizzle — dismiss restaurant"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => handleVerdict("sizzle")}
              disabled={!!verdict || exiting}
              className="w-16 h-16 rounded-full bg-stone-800 border-2 border-green-500/30 text-coral-500 hover:bg-green-500/10 active:scale-90 transition-all flex items-center justify-center disabled:opacity-50 text-3xl"
              aria-label="Sizzle — bookmark restaurant"
            >
              🔥
            </button>
          </div>

          {/* Hint text */}
          <p className="text-stone-600 text-xs mt-4">
            Swipe right to sizzle, left to fizzle
          </p>
        </>
      )}
    </div>
  );
}
