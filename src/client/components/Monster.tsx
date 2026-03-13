import type { ReactNode } from "react";

interface MonsterProps {
  readonly variant: "welcome" | "celebrate" | "bored" | "party" | "sleeping" | "snarky";
  readonly size?: number;
  readonly className?: string;
}

// Shared mochi body — warm round character with blush spots
function Body({ children }: { readonly children?: ReactNode }) {
  return (
    <>
      {/* Ground shadow */}
      <ellipse cx="50" cy="93" rx="22" ry="4" fill="#000" opacity="0.07" />
      {/* Main body */}
      <circle cx="50" cy="54" r="34" fill="#FDE5CC" stroke="#E4C9A0" strokeWidth="1.2" />
      {/* Inner glow — top highlight */}
      <ellipse cx="50" cy="40" rx="22" ry="14" fill="#FFF5E9" opacity="0.5" />
      {/* Blush spots */}
      <ellipse cx="27" cy="62" rx="7" ry="4" fill="#E8836E" opacity="0.22" />
      <ellipse cx="73" cy="62" rx="7" ry="4" fill="#E8836E" opacity="0.22" />
      {children}
    </>
  );
}

// Sparkle accent — a small 4-pointed star
function Sparkle({ x, y, size = 8, opacity = 0.5 }: { readonly x: number; readonly y: number; readonly size?: number; readonly opacity?: number }) {
  const h = size / 2;
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <line x1="0" y1={-h} x2="0" y2={h} stroke="#E8836E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={-h} y1="0" x2={h} y2="0" stroke="#E8836E" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function WelcomeFace() {
  return (
    <Body>
      {/* Eyes — friendly round dots */}
      <circle cx="38" cy="52" r="4" fill="#3D2317" />
      <circle cx="62" cy="52" r="4" fill="#3D2317" />
      <circle cx="40" cy="50" r="1.5" fill="white" />
      <circle cx="64" cy="50" r="1.5" fill="white" />
      {/* Happy smile */}
      <path d="M38 66 Q50 77 62 66" fill="none" stroke="#3D2317" strokeWidth="2.8" strokeLinecap="round" />
      {/* Waving arm */}
      <path d="M83 46 Q90 36 94 30" fill="none" stroke="#E4C9A0" strokeWidth="5" strokeLinecap="round" />
      <circle cx="94" cy="28" r="3" fill="#FDE5CC" stroke="#E4C9A0" strokeWidth="1" />
      <Sparkle x={14} y={32} />
    </Body>
  );
}

function CelebrateFace() {
  return (
    <Body>
      {/* Squinty happy eyes */}
      <path d="M32 52 Q38 46 44 52" fill="none" stroke="#3D2317" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 52 Q62 46 68 52" fill="none" stroke="#3D2317" strokeWidth="3" strokeLinecap="round" />
      {/* Big open grin */}
      <path d="M35 64 Q50 82 65 64" fill="#3D2317" stroke="none" />
      <path d="M40 64 Q50 60 60 64" fill="#FDE5CC" stroke="none" />
      {/* Arms up! */}
      <path d="M16 46 Q8 30 6 22" fill="none" stroke="#E4C9A0" strokeWidth="5" strokeLinecap="round" />
      <path d="M84 46 Q92 30 94 22" fill="none" stroke="#E4C9A0" strokeWidth="5" strokeLinecap="round" />
      {/* Confetti */}
      <circle cx="12" cy="16" r="3" fill="#E8836E" opacity="0.7" />
      <circle cx="88" cy="14" r="2.5" fill="#3BA8A0" opacity="0.7" />
      <circle cx="26" cy="8" r="2" fill="#D4A24E" opacity="0.7" />
      <circle cx="76" cy="6" r="2.5" fill="#E8836E" opacity="0.6" />
      <Sparkle x={50} y={10} size={10} opacity={0.6} />
    </Body>
  );
}

function BoredFace() {
  return (
    <Body>
      {/* Half-lidded eyes — dots with flat eyelid line */}
      <circle cx="38" cy="54" r="4" fill="#3D2317" />
      <circle cx="62" cy="54" r="4" fill="#3D2317" />
      <line x1="32" y1="50" x2="44" y2="51" stroke="#FDE5CC" strokeWidth="5" />
      <line x1="56" y1="51" x2="68" y2="50" stroke="#FDE5CC" strokeWidth="5" />
      <line x1="32" y1="50" x2="44" y2="51" stroke="#E4C9A0" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="56" y1="51" x2="68" y2="50" stroke="#E4C9A0" strokeWidth="1.2" strokeLinecap="round" />
      {/* Flat mouth */}
      <line x1="40" y1="68" x2="60" y2="68" stroke="#3D2317" strokeWidth="2.5" strokeLinecap="round" />
      {/* Sweat drop */}
      <path d="M78 36 Q80 30 82 36 Q80 40 78 36" fill="#87CEEB" opacity="0.6" />
    </Body>
  );
}

function PartyFace() {
  return (
    <Body>
      {/* Party hat */}
      <polygon points="50,6 38,30 62,30" fill="#E8836E" stroke="#D4705C" strokeWidth="1" />
      <circle cx="50" cy="5" r="3" fill="#D4A24E" />
      <line x1="42" y1="22" x2="58" y2="22" stroke="#FDE5CC" strokeWidth="1.5" opacity="0.6" />
      {/* Happy eyes */}
      <circle cx="38" cy="52" r="4" fill="#3D2317" />
      <circle cx="62" cy="52" r="4" fill="#3D2317" />
      <circle cx="40" cy="50" r="1.5" fill="white" />
      <circle cx="64" cy="50" r="1.5" fill="white" />
      {/* Wide grin */}
      <path d="M36 64 Q50 80 64 64" fill="#3D2317" stroke="none" />
      <path d="M40 64 Q50 60 60 64" fill="#FDE5CC" stroke="none" />
      {/* Confetti dots */}
      <circle cx="10" cy="40" r="2" fill="#3BA8A0" opacity="0.5" />
      <circle cx="90" cy="38" r="2.5" fill="#D4A24E" opacity="0.5" />
      <circle cx="18" cy="18" r="2" fill="#E8836E" opacity="0.4" />
    </Body>
  );
}

function SleepingFace() {
  return (
    <Body>
      {/* Closed eyes — gentle curves */}
      <path d="M32 54 Q38 50 44 54" fill="none" stroke="#3D2317" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 54 Q62 50 68 54" fill="none" stroke="#3D2317" strokeWidth="2.5" strokeLinecap="round" />
      {/* Tiny content smile */}
      <path d="M44 68 Q50 73 56 68" fill="none" stroke="#3D2317" strokeWidth="2" strokeLinecap="round" />
      {/* Zzz */}
      <text x="76" y="28" fill="#3BA8A0" opacity="0.6" fontSize="14" fontWeight="bold" fontFamily="sans-serif">z</text>
      <text x="84" y="18" fill="#3BA8A0" opacity="0.45" fontSize="11" fontWeight="bold" fontFamily="sans-serif">z</text>
      <text x="90" y="10" fill="#3BA8A0" opacity="0.3" fontSize="9" fontWeight="bold" fontFamily="sans-serif">z</text>
    </Body>
  );
}

function SnarkyFace() {
  return (
    <Body>
      {/* Left eye — normal */}
      <circle cx="38" cy="52" r="4" fill="#3D2317" />
      <circle cx="40" cy="50" r="1.5" fill="white" />
      {/* Right eye — squinting/skeptical */}
      <circle cx="62" cy="54" r="3.5" fill="#3D2317" />
      <line x1="56" y1="50" x2="68" y2="52" stroke="#FDE5CC" strokeWidth="5" />
      <line x1="56" y1="50" x2="68" y2="52" stroke="#E4C9A0" strokeWidth="1.2" strokeLinecap="round" />
      {/* Raised eyebrow */}
      <path d="M56 44 Q62 40 68 43" fill="none" stroke="#3D2317" strokeWidth="2" strokeLinecap="round" />
      {/* Crooked smirk */}
      <path d="M40 66 Q48 72 56 68 Q60 66 64 64" fill="none" stroke="#3D2317" strokeWidth="2.5" strokeLinecap="round" />
      {/* Side-eye sweat drop */}
      <path d="M82 42 Q84 36 86 42 Q84 46 82 42" fill="#87CEEB" opacity="0.5" />
    </Body>
  );
}

const VARIANT_FACE: Record<MonsterProps["variant"], () => ReactNode> = {
  welcome: WelcomeFace,
  celebrate: CelebrateFace,
  bored: BoredFace,
  party: PartyFace,
  sleeping: SleepingFace,
  snarky: SnarkyFace,
};

export function Monster({ variant, size = 48, className = "" }: MonsterProps) {
  const Face = VARIANT_FACE[variant];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      role="img"
    >
      <Face />
    </svg>
  );
}
