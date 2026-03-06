import { useFetch } from "../hooks/useApi";
import { useCountUp } from "../hooks/useCountUp";
import { MemberAvatar } from "./MemberAvatar";
import { Slurms } from "./Slurms";
import { randomLoadingMessage, SLURMS_QUOTES } from "../utils/personality";
import type { FamilyStatsData, MemberStats } from "../types";

interface FamilyStatsProps {
  readonly token: string;
}

function StatCard({ label, value }: { readonly label: string; readonly value: number }) {
  const animated = useCountUp(value) ?? 0;
  return (
    <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-5 text-center animate-fade-up">
      <p className="font-display font-black text-4xl text-orange-500">{animated}</p>
      <p className="text-stone-400 text-sm mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function CuisineBar({ cuisine, count, maxCount }: { readonly cuisine: string; readonly count: number; readonly maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-stone-300 text-sm w-24 truncate flex-shrink-0">{cuisine}</span>
      <div className="flex-1 h-4 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full animate-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-stone-500 text-xs w-6 text-right">{count}</span>
    </div>
  );
}

function findCallout(members: readonly MemberStats[], type: "fan" | "critic"): MemberStats | null {
  const withScores = members.filter((m) => m.avg_score !== null && m.review_count > 0);
  if (withScores.length < 2) return null;

  const sorted = [...withScores].sort((a, b) =>
    type === "fan" ? (b.avg_score! - a.avg_score!) : (a.avg_score! - b.avg_score!)
  );
  return sorted[0] ?? null;
}

export function FamilyStats({ token }: FamilyStatsProps) {
  const { data: stats, loading, error } = useFetch<FamilyStatsData>(token, "/api/stats");

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 pb-20">
        <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
          <div className="px-4 py-4">
            <h1 className="font-display text-xl font-black text-orange-500 italic">Stats</h1>
          </div>
        </header>
        <div className="flex flex-col items-center py-12">
          <Slurms variant="party" size={48} />
          <p className="text-stone-500 text-sm italic mt-3">{randomLoadingMessage()}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-dvh bg-stone-950 pb-20">
        <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
          <div className="px-4 py-4">
            <h1 className="font-display text-xl font-black text-orange-500 italic">Stats</h1>
          </div>
        </header>
        <div className="flex flex-col items-center py-16">
          <Slurms variant="snarky" size={56} />
          <p className="text-stone-400 font-medium mt-4">{error ?? SLURMS_QUOTES.error}</p>
        </div>
      </div>
    );
  }

  if (stats.total_restaurants === 0 && stats.total_reviews === 0) {
    return (
      <div className="min-h-dvh bg-stone-950 pb-20">
        <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
          <div className="px-4 py-4">
            <h1 className="font-display text-xl font-black text-orange-500 italic">Stats</h1>
          </div>
        </header>
        <div className="flex flex-col items-center py-16 px-6 animate-fade-up">
          <Slurms variant="sleeping" size={56} />
          <p className="text-stone-300 font-display font-bold text-lg mt-4 text-center">
            No stats yet
          </p>
          <p className="text-stone-500 text-sm mt-2 text-center max-w-xs">
            Once you start adding restaurants and reviews, you'll see leaderboards, cuisine breakdowns, and category averages here.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs opacity-30">
            <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center">
              <p className="font-display font-black text-3xl text-orange-500">0</p>
              <p className="text-stone-500 text-xs uppercase">Restaurants</p>
            </div>
            <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center">
              <p className="font-display font-black text-3xl text-orange-500">0</p>
              <p className="text-stone-500 text-xs uppercase">Reviews</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const biggestFan = findCallout(stats.members, "fan");
  const harshestCritic = findCallout(stats.members, "critic");
  const maxCuisineCount = stats.cuisine_breakdown.length > 0
    ? Math.max(...stats.cuisine_breakdown.map((c) => c.count))
    : 0;
  const catAvg = stats.category_averages;

  return (
    <div className="min-h-dvh bg-stone-950 pb-20">
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-4">
          <h1 className="font-display text-xl font-black text-orange-500 italic">Stats</h1>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Top-level stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Restaurants" value={stats.total_restaurants} />
          <StatCard label="Reviews" value={stats.total_reviews} />
        </div>

        {/* Callouts */}
        {(biggestFan || harshestCritic) && (
          <div className="grid grid-cols-2 gap-3">
            {biggestFan && (
              <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center animate-fade-up">
                <p className="text-xl mb-1">🥰</p>
                <p className="text-stone-300 font-medium text-sm">{biggestFan.name}</p>
                <p className="text-stone-500 text-xs uppercase tracking-wider mt-0.5">Biggest Fan</p>
                <p className="font-display font-black text-green-500 text-lg">{biggestFan.avg_score?.toFixed(1)}</p>
              </div>
            )}
            {harshestCritic && (
              <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center animate-fade-up">
                <p className="text-xl mb-1">🧐</p>
                <p className="text-stone-300 font-medium text-sm">{harshestCritic.name}</p>
                <p className="text-stone-500 text-xs uppercase tracking-wider mt-0.5">Harshest Critic</p>
                <p className="font-display font-black text-amber-500 text-lg">{harshestCritic.avg_score?.toFixed(1)}</p>
              </div>
            )}
          </div>
        )}

        {/* Member Leaderboard */}
        {stats.members.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-display font-bold text-base text-stone-300 mb-3 uppercase tracking-wider">
              Leaderboard
            </h2>
            <div className="space-y-2">
              {stats.members.map((m, i) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 bg-stone-900 border border-stone-800/50 rounded-xl p-3"
                >
                  <span className="text-stone-500 text-sm font-bold w-5">{i + 1}</span>
                  <MemberAvatar name={m.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-200 font-medium text-sm truncate">{m.name}</p>
                    <p className="text-stone-500 text-xs">{m.review_count} reviews</p>
                  </div>
                  {m.avg_score !== null && (
                    <span className="font-display font-black text-lg text-amber-400">
                      {m.avg_score.toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuisine Breakdown */}
        {stats.cuisine_breakdown.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-display font-bold text-base text-stone-300 mb-3 uppercase tracking-wider">
              Cuisines
            </h2>
            <div className="space-y-2.5 bg-stone-900 border border-stone-800/50 rounded-xl p-4">
              {stats.cuisine_breakdown.map((c) => (
                <CuisineBar key={c.cuisine} cuisine={c.cuisine} count={c.count} maxCount={maxCuisineCount} />
              ))}
            </div>
          </div>
        )}

        {/* Category Averages */}
        {(catAvg.food !== null || catAvg.service !== null || catAvg.ambiance !== null || catAvg.value !== null) && (
          <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display font-bold text-base text-stone-300 mb-3 uppercase tracking-wider">
              Category Averages
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {catAvg.food !== null && (
                <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center">
                  <p className="text-lg">🍔</p>
                  <p className="font-display font-black text-2xl text-stone-50">{catAvg.food.toFixed(1)}</p>
                  <p className="text-stone-500 text-xs uppercase tracking-wider">Food</p>
                </div>
              )}
              {catAvg.service !== null && (
                <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center">
                  <p className="text-lg">🤝</p>
                  <p className="font-display font-black text-2xl text-stone-50">{catAvg.service.toFixed(1)}</p>
                  <p className="text-stone-500 text-xs uppercase tracking-wider">Service</p>
                </div>
              )}
              {catAvg.ambiance !== null && (
                <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center">
                  <p className="text-lg">🕯️</p>
                  <p className="font-display font-black text-2xl text-stone-50">{catAvg.ambiance.toFixed(1)}</p>
                  <p className="text-stone-500 text-xs uppercase tracking-wider">Ambiance</p>
                </div>
              )}
              {catAvg.value !== null && (
                <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 text-center">
                  <p className="text-lg">💰</p>
                  <p className="font-display font-black text-2xl text-stone-50">{catAvg.value.toFixed(1)}</p>
                  <p className="text-stone-500 text-xs uppercase tracking-wider">Value</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
