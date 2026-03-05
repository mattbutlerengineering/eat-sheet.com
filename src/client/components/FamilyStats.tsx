import { Slurms } from "./Slurms";
import { SLURMS_QUOTES } from "../utils/personality";

interface FamilyStatsProps {
  readonly token: string;
}

export function FamilyStats({ token: _token }: FamilyStatsProps) {
  return (
    <div className="min-h-dvh bg-stone-950 pb-20">
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-4">
          <h1 className="font-display text-xl font-black text-orange-500">Stats</h1>
        </div>
      </header>
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <Slurms variant="bored" size={56} />
        <p className="text-stone-400 font-medium mt-4 text-center">Coming soon...</p>
        <p className="text-stone-500 text-sm mt-1 italic text-center">{SLURMS_QUOTES.empty}</p>
      </div>
    </div>
  );
}
