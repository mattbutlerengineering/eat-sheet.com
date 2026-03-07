interface MonsterProps {
  readonly variant: "welcome" | "celebrate" | "bored" | "party" | "sleeping" | "snarky";
  readonly size?: number;
  readonly className?: string;
}

const VARIANT_TO_MONSTER: Record<MonsterProps["variant"], string> = {
  party: "teal-big",
  celebrate: "teal-big",
  welcome: "blue-bottom-right",
  bored: "coral-left",
  sleeping: "coral-left",
  snarky: "tiny-red-top-left",
};

export function Monster({ variant, size = 48, className = "" }: MonsterProps) {
  const monster = VARIANT_TO_MONSTER[variant];
  return (
    <img
      src={`/monsters/${monster}-256.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
