import { useState, useRef } from "react";
import { sliderPersonality } from "../utils/personality";

interface ScoreSliderProps {
  readonly label: string;
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
  readonly required?: boolean;
}

function scoreColor(score: number): string {
  if (score <= 3) return "text-red-500";
  if (score <= 5) return "text-amber-500";
  if (score <= 7) return "text-amber-400";
  return "text-green-500";
}

function scoreEmoji(score: number): string {
  if (score <= 2) return "😬";
  if (score <= 4) return "😐";
  if (score <= 6) return "🙂";
  if (score <= 8) return "😋";
  return "🤩";
}

export function ScoreSlider({ label, value, onChange, required }: ScoreSliderProps) {
  const [active, setActive] = useState(value !== null);
  const displayRef = useRef<HTMLSpanElement>(null);

  const handleToggle = () => {
    if (required) return;
    if (active) {
      setActive(false);
      onChange(null);
    } else {
      setActive(true);
      onChange(5);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);

    if (displayRef.current) {
      displayRef.current.classList.remove("score-pop");
      void displayRef.current.offsetWidth;
      displayRef.current.classList.add("score-pop");
    }
  };

  const displayValue = value ?? 5;

  if (!active && !required) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 text-base text-stone-500 hover:text-stone-300 py-2.5 transition-colors"
      >
        <span className="w-6 h-6 rounded-full border border-stone-600 flex items-center justify-center text-xs">+</span>
        {label}
      </button>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {!required && (
            <button
              type="button"
              onClick={handleToggle}
              className="w-5 h-5 rounded-full bg-stone-700 flex items-center justify-center text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              ×
            </button>
          )}
          <span className="text-base font-medium text-stone-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{scoreEmoji(displayValue)}</span>
          <span
            ref={displayRef}
            className={`text-2xl font-display font-black tabular-nums ${scoreColor(displayValue)}`}
          >
            {displayValue}
          </span>
          <span className="text-stone-600 text-sm">/10</span>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={displayValue}
        onChange={handleChange}
        className="w-full slider-gradient-track"
      />
      <p className="text-xs text-stone-500 italic font-display mt-1">
        {sliderPersonality(displayValue)}
      </p>
    </div>
  );
}
