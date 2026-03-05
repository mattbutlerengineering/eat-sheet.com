import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import type { Restaurant, Member } from "../types";
import { useFetch } from "../hooks/useApi";
import { InviteCodePanel } from "./InviteCodePanel";
import { RandomPicker } from "./RandomPicker";
import { Slurms } from "./Slurms";
import { SLURMS_QUOTES, randomLoadingMessage, avatarColor } from "../utils/personality";
import { relativeTime } from "../utils/time";

const MapView = lazy(() =>
  import("./MapView").then((m) => ({ default: m.MapView }))
);

interface RestaurantListProps {
  readonly token: string;
  readonly member: Member;
  readonly onLogout: () => void;
}

type SortMode = "recent" | "score";
type ViewMode = "list" | "map";

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
  const { data: bookmarkedList } = useFetch<readonly Restaurant[]>(token, "/api/bookmarks");
  const [sort, setSort] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);
  const [showWantToTry, setShowWantToTry] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fabRef = useRef<HTMLAnchorElement>(null);

  const bookmarkedIds = useMemo(() => {
    if (!bookmarkedList) return new Set<string>();
    return new Set(bookmarkedList.map((b) => b.id));
  }, [bookmarkedList]);

  // Wiggle the FAB every 30s as a hint
  useEffect(() => {
    const interval = setInterval(() => {
      fabRef.current?.classList.add("animate-wiggle");
      setTimeout(() => fabRef.current?.classList.remove("animate-wiggle"), 600);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Unique cuisines from loaded data
  const cuisines = useMemo(() => {
    if (!restaurants) return [];
    const set = new Set<string>();
    for (const r of restaurants) {
      if (r.cuisine) set.add(r.cuisine);
    }
    return [...set].sort();
  }, [restaurants]);

  // Sorted + filtered list
  const filtered = useMemo(() => {
    if (!restaurants) return [];

    const q = search.toLowerCase().trim();

    return [...restaurants]
      .filter((r) => {
        if (showWantToTry && !bookmarkedIds.has(r.id)) return false;
        if (q && !r.name.toLowerCase().includes(q) && !(r.cuisine?.toLowerCase().includes(q))) {
          return false;
        }
        if (cuisineFilter && r.cuisine !== cuisineFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "score") {
          return (b.avg_score ?? 0) - (a.avg_score ?? 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [restaurants, search, cuisineFilter, sort, showWantToTry, bookmarkedIds]);

  const hasFilters = search.trim() !== "" || cuisineFilter !== null || showWantToTry;

  const clearFilters = () => {
    setSearch("");
    setCuisineFilter(null);
    setShowWantToTry(false);
  };

  return (
    <div className="min-h-dvh bg-stone-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-black text-orange-500 italic">eat sheet</h1>
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

      <div className="px-4 pb-28">
        {/* Search */}
        <div className="pt-4 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full pl-9 pr-4 py-2.5 bg-stone-800/50 border border-stone-800 rounded-xl text-stone-50 text-sm placeholder:text-stone-500 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Cuisine Chips + Want to Try */}
        {(cuisines.length > 0 || bookmarkedIds.size > 0) && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
            <button
              onClick={() => { setCuisineFilter(null); setShowWantToTry(false); }}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                cuisineFilter === null && !showWantToTry
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  : "bg-stone-800 text-stone-400 border border-stone-700"
              }`}
            >
              All
            </button>
            {bookmarkedIds.size > 0 && (
              <button
                onClick={() => setShowWantToTry(!showWantToTry)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  showWantToTry
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-stone-800 text-stone-400 border border-stone-700"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={showWantToTry ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                Want to Try ({bookmarkedIds.size})
              </button>
            )}
            {cuisines.map((c) => (
              <button
                key={c}
                onClick={() => setCuisineFilter(cuisineFilter === c ? null : c)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  cuisineFilter === c
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-stone-800 text-stone-400 border border-stone-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Sort, View & Pick */}
        <div className="flex items-center justify-between py-2">
          <div className="flex gap-1 bg-stone-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setSort("recent")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sort === "recent" && viewMode === "list"
                  ? "bg-stone-700 text-stone-50"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSort("score")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sort === "score" && viewMode === "list"
                  ? "bg-stone-700 text-stone-50"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Top Rated
            </button>
            <button
              onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              aria-label={viewMode === "list" ? "Show map view" : "Show list view"}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === "map"
                  ? "bg-stone-700 text-stone-50"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {viewMode === "list" ? (
                  <>
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </>
                ) : (
                  <>
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {filtered.length > 1 && (
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-stone-400 hover:text-orange-400 bg-stone-800/50 hover:bg-stone-800 rounded-lg transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
              Pick
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <div className="flex flex-col items-center py-8">
              <Slurms variant="party" size={48} />
              <p className="text-stone-500 text-sm italic mt-3">{randomLoadingMessage()}</p>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty State — no restaurants at all */}
        {!loading && restaurants && restaurants.length === 0 && (
          <div className="text-center py-16 animate-fade-up">
            <Slurms variant="bored" size={56} className="mx-auto" />
            <p className="text-stone-300 font-display font-bold text-lg mt-4">
              {SLURMS_QUOTES.emptyList}
            </p>
            <p className="text-stone-500 text-sm mt-2">Add a restaurant to get this party started</p>
            <Link
              to="/add"
              className="inline-block mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl active:scale-95 transition-all"
            >
              Add Your First Restaurant
            </Link>
          </div>
        )}

        {/* Empty State — filters returned nothing */}
        {!loading && restaurants && restaurants.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 animate-fade-up">
            <Slurms variant="snarky" size={48} className="mx-auto" />
            <p className="text-stone-300 font-display font-bold mt-4">
              {SLURMS_QUOTES.noResults}
            </p>
            <button
              onClick={clearFilters}
              className="text-orange-500 text-sm font-medium mt-3 hover:text-orange-400"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Map View */}
        {viewMode === "map" && !loading && filtered.length > 0 && (
          <div className="mt-2">
            <Suspense fallback={<div className="shimmer h-[60vh] rounded-xl" />}>
              <MapView restaurants={filtered} />
            </Suspense>
          </div>
        )}

        {/* Restaurant Cards */}
        {viewMode === "list" && (
        <div className="space-y-3 mt-2">
          {filtered.map((restaurant, i) => (
            <Link
              key={restaurant.id}
              to={`/restaurant/${restaurant.id}`}
              className="block animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="card-warm bg-stone-900 border border-stone-800/50 rounded-xl p-5">
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {restaurant.cuisine && (
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium text-white/90 ${avatarColor(restaurant.cuisine)}`}>
                          {restaurant.cuisine}
                        </span>
                      )}
                      <span className="text-sm text-stone-500">
                        {restaurant.review_count} {restaurant.review_count === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                      {restaurant.creator_name && (
                        <span>Added by {restaurant.created_by === member.id ? "You" : restaurant.creator_name}</span>
                      )}
                      {restaurant.last_visited_at && (
                        <>
                          <span>·</span>
                          <span>Visited {relativeTime(restaurant.last_visited_at)}</span>
                        </>
                      )}
                      {(restaurant.bookmark_count ?? 0) > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-orange-500/70">
                            🔖 {restaurant.bookmark_count} {restaurant.bookmark_count === 1 ? "wants" : "want"} to try
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-lg font-display font-black text-lg ${scoreBadgeColor(restaurant.avg_score)} ${
                      restaurant.avg_score !== null && restaurant.avg_score >= 8
                        ? "animate-glow-pulse"
                        : ""
                    }`}
                  >
                    {scoreDisplay(restaurant.avg_score)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>

      {/* FAB */}
      <Link
        ref={fabRef}
        to="/add"
        className="fixed bottom-20 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-all z-30"
      >
        <span className="text-2xl text-white leading-none">+</span>
      </Link>

      {showInviteCode && (
        <InviteCodePanel token={token} onClose={() => setShowInviteCode(false)} />
      )}

      {showPicker && filtered.length > 0 && (
        <RandomPicker
          restaurants={filtered}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
