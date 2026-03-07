export function scoreBadgeColor(score: number | null): string {
  if (score === null) return "bg-stone-700 text-stone-400";
  if (score <= 3) return "bg-red-500/20 text-red-500";
  if (score <= 5) return "bg-amber-500/20 text-amber-500";
  if (score <= 7) return "bg-amber-400/20 text-amber-400";
  return "bg-green-500/20 text-green-500";
}

export function scoreDisplay(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(1);
}
