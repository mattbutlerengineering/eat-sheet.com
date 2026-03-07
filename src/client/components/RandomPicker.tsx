import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "../utils/analytics";
import { Slurms } from "./Slurms";
import { OverlayCloseButton, BounceDots } from "./OverlayParts";
import { SLURMS_QUOTES } from "../utils/personality";
import { scoreBadgeColor } from "../utils/score";
import { cuisineLabel } from "../utils/cuisines";
import type { Restaurant } from "../types";

interface RandomPickerProps {
  readonly restaurants: readonly Restaurant[];
  readonly onClose: () => void;
}

// CSS confetti particles
const CONFETTI_COLORS = ["#f97316", "#fbbf24", "#ef4444", "#22c55e", "#8b5cf6", "#ec4899"];

function ConfettiBurst() {
  const particles = Array.from({ length: 20 }, (_, i) => {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]!;
    const angle = (i / 20) * 360;
    const distance = 60 + Math.random() * 80;
    const x = Math.cos((angle * Math.PI) / 180) * distance;
    const y = Math.sin((angle * Math.PI) / 180) * distance - 40;
    const delay = Math.random() * 0.3;
    const size = 6 + Math.random() * 6;

    return (
      <div
        key={i}
        className="confetti-particle"
        style={{
          backgroundColor: color,
          width: size,
          height: size,
          left: "50%",
          top: "40%",
          animationDelay: `${delay}s`,
          transform: `translate(${x}px, ${y}px)`,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        }}
      />
    );
  });

  return <div className="absolute inset-0 pointer-events-none overflow-hidden">{particles}</div>;
}

export function RandomPicker({ restaurants, onClose }: RandomPickerProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"spinning" | "result">("spinning");
  const [displayIndex, setDisplayIndex] = useState(0);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const spinIdRef = useRef(0);

  const spin = useCallback(() => {
    if (restaurants.length === 0) return;
    track("picker_spin", { restaurant_count: restaurants.length });

    const thisSpinId = ++spinIdRef.current;

    setPhase("spinning");
    setWinner(null);

    const winnerIdx = Math.floor(Math.random() * restaurants.length);
    const pickedWinner = restaurants[winnerIdx];
    if (!pickedWinner) return;

    let tick = 0;
    const totalTicks = 15 + Math.floor(Math.random() * 10);

    const step = () => {
      if (spinIdRef.current !== thisSpinId) return;

      tick++;

      if (tick >= totalTicks) {
        setDisplayIndex(winnerIdx);
        setWinner(pickedWinner);
        setPhase("result");
        return;
      }

      setDisplayIndex((prev) => (prev + 1) % restaurants.length);

      const progress = tick / totalTicks;
      const delay = 60 + Math.pow(progress, 2.5) * 350;
      timeoutRef.current = window.setTimeout(step, delay);
    };

    timeoutRef.current = window.setTimeout(step, 60);
  }, [restaurants]);

  useEffect(() => {
    spin();
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, [spin]);

  const display = restaurants[displayIndex];

  if (restaurants.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="text-center">
          <Slurms variant="bored" size={48} className="mx-auto" />
          <p className="text-stone-400 font-medium mt-3">
            {SLURMS_QUOTES.empty}
          </p>
          <button
            onClick={onClose}
            className="mt-4 text-orange-500 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
      <OverlayCloseButton onClick={onClose} />

      <p className="font-display text-lg text-stone-500 mb-2 tracking-wide">
        {phase === "spinning" ? "Picking..." : "You should try"}
      </p>

      <div
        className={`
        relative w-full max-w-sm rounded-2xl p-8 text-center transition-all duration-700 ease-out
        ${
          phase === "result"
            ? "bg-stone-900 border-2 border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.2)] scale-105"
            : "bg-stone-900/80 border border-stone-800/50 scale-100"
        }
      `}
      >
        {/* Confetti on result */}
        {phase === "result" && <ConfettiBurst />}

        {phase === "spinning" && display && (
          <div key={displayIndex}>
            <p className="font-display font-black text-2xl text-stone-200 truncate">
              {display.name}
            </p>
            {display.cuisine && (
              <p className="text-stone-500 text-sm mt-1">{cuisineLabel(display.cuisine)}</p>
            )}
          </div>
        )}

        {phase === "result" && winner && (
          <div className="animate-slide-up relative z-10">
            {winner.photo_url && (
              <img
                src={winner.photo_url}
                alt=""
                className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 ring-2 ring-orange-500/30"
              />
            )}
            <p className="font-display font-black text-3xl text-stone-50">
              {winner.name}
            </p>
            {winner.cuisine && (
              <p className="text-orange-500/80 font-medium mt-2">
                {cuisineLabel(winner.cuisine)}
              </p>
            )}
            {winner.address && (
              <p className="text-stone-500 text-sm mt-1">{winner.address}</p>
            )}
            {winner.avg_score !== null && (
              <div
                className={`mt-5 inline-flex px-3 py-1.5 rounded-lg font-display font-black text-xl ${scoreBadgeColor(winner.avg_score)}`}
              >
                {winner.avg_score.toFixed(1)}
              </div>
            )}

            {/* Slurms celebrates */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Slurms variant="celebrate" size={36} />
              <span className="text-stone-400 text-sm italic font-display">
                {SLURMS_QUOTES.pickerWin}
              </span>
            </div>
          </div>
        )}
      </div>

      {phase === "spinning" && (
        <div className="mt-8">
          <BounceDots />
        </div>
      )}

      {phase === "result" && winner && (
        <div
          className="flex gap-3 mt-8 animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          <button
            onClick={spin}
            className="px-6 py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-colors active:scale-[0.98]"
          >
            Spin again
          </button>
          <button
            onClick={() => { track("picker_result_accepted", { restaurant_id: winner.id }); navigate(`/restaurant/${winner.id}`); }}
            className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
          >
            Let's go!
          </button>
        </div>
      )}
    </div>
  );
}
