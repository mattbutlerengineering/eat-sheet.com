import { useState } from "react";
import { Link } from "react-router-dom";
import type { Restaurant, Member } from "../types";
import { useFetch } from "../hooks/useApi";
import { InviteCodePanel } from "./InviteCodePanel";

interface RestaurantListProps {
  readonly token: string;
  readonly member: Member;
  readonly onLogout: () => void;
}

type SortMode = "recent" | "score";

function scoreDisplay(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(1);
}

function scoreBadgeColor(score: number | null): string {
  if (score === null) return "bg-stone-700 text-stone-400";
  if (score <= 3) return "bg-red-500/20 text-red-500";
  if (score <= 5) return "bg-amber-500/20 text-amber-500";
  if (score <= 7) return "bg-amber-400/20 text-amber-400";
  return "bg-green-500/20 text-green-500";
}

export function RestaurantList({ token, member, onLogout }: RestaurantListProps) {
  const { data: restaurants, loading } = useFetch<readonly Restaurant[]>(token, "/api/restaurants");
  const [sort, setSort] = useState<SortMode>("recent");
  const [showInviteCode, setShowInviteCode] = useState(false);

  const sorted = restaurants
    ? [...restaurants].sort((a, b) => {
        if (sort === "score") {
          return (b.avg_score ?? 0) - (a.avg_score ?? 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
    : [];

  return (
    <div className="min-h-dvh bg-stone-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-black text-orange-500">eat sheet</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base text-stone-400">{member.name}</span>
            {member.is_admin && (
              <button
                onClick={() => setShowInviteCode(true)}
                className="text-sm text-orange-500/70 hover:text-orange-400 transition-colors"
              >
                Invite
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24">
        {/* Sort & Add */}
        <div className="flex items-center justify-between py-4">
          <div className="flex gap-1 bg-stone-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setSort("recent")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sort === "recent"
                  ? "bg-stone-700 text-stone-50"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSort("score")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sort === "score"
                  ? "bg-stone-700 text-stone-50"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Top Rated
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && sorted.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-stone-400 font-medium">No restaurants yet</p>
            <p className="text-stone-500 text-sm mt-1">Add one to get started</p>
          </div>
        )}

        {/* Restaurant Cards */}
        <div className="space-y-3">
          {sorted.map((restaurant, i) => (
            <Link
              key={restaurant.id}
              to={`/restaurant/${restaurant.id}`}
              className="block animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-5 active:scale-[0.98] transition-transform">
                <div className="flex items-start justify-between gap-3">
                  {restaurant.photo_url && (
                    <img
                      src={restaurant.photo_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-lg text-stone-50 truncate">
                      {restaurant.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {restaurant.cuisine && (
                        <span className="text-sm text-orange-500/80 font-medium">
                          {restaurant.cuisine}
                        </span>
                      )}
                      <span className="text-sm text-stone-500">
                        {restaurant.review_count} {restaurant.review_count === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg font-display font-black text-lg ${scoreBadgeColor(restaurant.avg_score)}`}>
                    {scoreDisplay(restaurant.avg_score)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAB */}
      <Link
        to="/add"
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
      >
        <span className="text-2xl text-white leading-none">+</span>
      </Link>

      {showInviteCode && (
        <InviteCodePanel token={token} onClose={() => setShowInviteCode(false)} />
      )}
    </div>
  );
}
