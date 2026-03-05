// Slurms McKenzie — the Party Worm mascot
// Simple inline SVG art: sunglasses-wearing worm with party hat

interface SlurmsProps {
  readonly variant: "welcome" | "celebrate" | "bored" | "party" | "sleeping" | "snarky";
  readonly size?: number;
  readonly className?: string;
}

export function Slurms({ variant, size = 48, className = "" }: SlurmsProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Party hat */}
      {(variant === "welcome" || variant === "celebrate" || variant === "party") && (
        <g>
          <polygon points="32,2 24,18 40,18" fill="#f97316" />
          <circle cx="32" cy="2" r="2" fill="#fbbf24" />
          <line x1="28" y1="8" x2="30" y2="14" stroke="#fbbf24" strokeWidth="1" />
          <line x1="36" y1="8" x2="34" y2="14" stroke="#fbbf24" strokeWidth="1" />
        </g>
      )}
      {/* Sleeping Z's */}
      {variant === "sleeping" && (
        <g fill="#78716c" fontFamily="var(--font-display)" fontWeight="900" fontSize="10">
          <text x="42" y="14">z</text>
          <text x="48" y="8" fontSize="8">z</text>
          <text x="52" y="4" fontSize="6">z</text>
        </g>
      )}
      {/* Worm body — a friendly wavy shape */}
      <ellipse cx="32" cy="38" rx="14" ry="18" fill="#a3e635" />
      <ellipse cx="32" cy="42" rx="11" ry="10" fill="#84cc16" />
      {/* Belly */}
      <ellipse cx="32" cy="44" rx="7" ry="6" fill="#bef264" />
      {/* Sunglasses */}
      <g>
        <rect x="20" y="30" width="10" height="7" rx="2" fill="#1c1917" />
        <rect x="34" y="30" width="10" height="7" rx="2" fill="#1c1917" />
        <line x1="30" y1="33" x2="34" y2="33" stroke="#1c1917" strokeWidth="2" />
        {/* Shine on glasses */}
        <rect x="22" y="31" width="3" height="2" rx="1" fill="#44403c" opacity="0.6" />
        <rect x="36" y="31" width="3" height="2" rx="1" fill="#44403c" opacity="0.6" />
      </g>
      {/* Mouth */}
      {variant === "snarky" && (
        <>
          {/* Raised eyebrow above right lens */}
          <path d="M35 28 Q39 25 44 27" stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Smirk */}
          <path d="M28 42 Q33 46 37 41" stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {variant === "bored" && (
        <line x1="28" y1="42" x2="36" y2="42" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {variant === "sleeping" && (
        <path d="M28 43 Q32 45 36 43" stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {(variant === "welcome" || variant === "party") && (
        <path d="M27 41 Q32 47 37 41" stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {variant === "celebrate" && (
        <>
          <path d="M26 40 Q32 49 38 40" stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="32" cy="44" rx="4" ry="2" fill="#1c1917" opacity="0.3" />
        </>
      )}
      {/* Arms — little nubs */}
      {(variant === "celebrate" || variant === "party") && (
        <>
          <line x1="18" y1="36" x2="12" y2="26" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" />
          <line x1="46" y1="36" x2="52" y2="26" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {variant === "welcome" && (
        <>
          <line x1="18" y1="36" x2="14" y2="30" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" />
          <line x1="46" y1="36" x2="50" y2="30" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {(variant === "bored" || variant === "snarky") && (
        <>
          <line x1="18" y1="38" x2="14" y2="42" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" />
          <line x1="46" y1="38" x2="50" y2="42" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
