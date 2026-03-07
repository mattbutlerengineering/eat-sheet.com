import { Monster } from "./Monster";

export type TonightMode = "usual" | "new";

interface TonightModeSelectProps {
  readonly onSelect: (mode: TonightMode) => void;
}

const MODES = [
  {
    mode: "usual" as const,
    label: "Old Favorite",
    description: "A crowd-pleaser your group already loves",
    monsterVariant: "party" as const,
  },
  {
    mode: "new" as const,
    label: "Somewhere New",
    description: "A spot you haven't tried yet",
    monsterVariant: "celebrate" as const,
  },
] as const;

export function TonightModeSelect({ onSelect }: TonightModeSelectProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <p className="font-display text-lg text-stone-400 tracking-wide">
        What are you feeling?
      </p>
      <div className="flex flex-col gap-4 w-full">
        {MODES.map(({ mode, label, description, monsterVariant }) => (
          <button
            key={mode}
            onClick={() => onSelect(mode)}
            className="w-full p-6 bg-stone-900 border border-stone-800/50 rounded-2xl text-left hover:border-coral-500/40 hover:bg-stone-900/80 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <Monster variant={monsterVariant} size={44} />
              <div>
                <p className="font-display font-bold text-lg text-stone-50 group-hover:text-coral-500 transition-colors">
                  {label}
                </p>
                <p className="text-stone-500 text-sm mt-0.5">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
