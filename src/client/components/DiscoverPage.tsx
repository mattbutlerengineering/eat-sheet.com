import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { track } from "../utils/analytics";
import { useApi, useFetch } from "../hooks/useApi";
import { ActivityFeed } from "./ActivityFeed";
import { cuisineLabel } from "../utils/cuisines";
import type { NearbyPlace, Restaurant } from "../types";

interface DiscoverPageProps {
  readonly token: string;
}

type DiscoverTab = "activity" | "nearby";

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "denied"; message: string }
  | { status: "ready"; latitude: number; longitude: number };

function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const retriedRef = useRef(false);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "denied", message: "Geolocation is not supported by your browser" });
      return;
    }
    setGeo({ status: "requesting" });

    const attempt = (retrying: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({
            status: "ready",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGeo({ status: "denied", message: "Location access denied. Enable it in your browser settings to discover nearby restaurants." });
          } else if (!retrying) {
            // Retry once on timeout or position unavailable (transient on mobile)
            retriedRef.current = true;
            setTimeout(() => attempt(true), 1000);
          } else {
            setGeo({ status: "denied", message: "Could not determine your location. Please try again." });
          }
        },
        {
          enableHighAccuracy: retrying,
          timeout: retrying ? 20000 : 10000,
          maximumAge: 300000,
        }
      );
    };

    retriedRef.current = false;
    attempt(false);
  }, []);

  return { geo, request };
}

function ScoreBadge({ score, label }: { readonly score: number; readonly label: string }) {
  const color =
    score <= 3 ? "bg-red-500/20 text-red-400" :
    score <= 5 ? "bg-amber-500/20 text-amber-400" :
    score <= 7 ? "bg-amber-400/20 text-amber-300" :
    "bg-green-500/20 text-green-400";
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
      {score} {label}
    </span>
  );
}

function DiscoverCard({
  place,
  isAdded,
  onAdd,
  adding,
  onReview,
  onDismiss,
}: {
  readonly place: NearbyPlace;
  readonly isAdded: boolean;
  readonly onAdd: () => void;
  readonly adding: boolean;
  readonly onReview: () => void;
  readonly onDismiss: () => void;
}) {
  return (
    <div className="bg-stone-900 rounded-xl p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-stone-100 truncate">{place.name}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {place.cuisine && (
            <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
              {cuisineLabel(place.cuisine)}
            </span>
          )}
          {place.google_rating != null && (
            <span className="text-xs text-stone-500">
              {place.google_rating.toFixed(1)} ({place.google_rating_count.toLocaleString()})
            </span>
          )}
        </div>
        {place.address && (
          <p className="text-xs text-stone-500 mt-1 truncate">{place.address}</p>
        )}
        {place.eat_sheet_score != null && (
          <div className="mt-2 flex items-center gap-1.5">
            <ScoreBadge score={place.eat_sheet_score} label="eat sheet" />
            <span className="text-xs text-stone-500">
              ({place.eat_sheet_reviews} {place.eat_sheet_reviews === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {isAdded ? (
          <button
            onClick={onReview}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-coral-500/20 text-coral-500 hover:bg-coral-500/30 active:scale-95 transition-colors"
          >
            Review
          </button>
        ) : (
          <button
            onClick={onAdd}
            disabled={adding}
            aria-label={`Add ${place.name}`}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-coral-500/20 text-coral-500 hover:bg-coral-500/30 active:scale-95"
          >
            {adding ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label={`Dismiss ${place.name}`}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:text-stone-400 hover:bg-stone-800 active:scale-95 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function NearbyContent({ token }: { readonly token: string }) {
  const { geo, request } = useGeolocation();
  const { post } = useApi(token);
  const { data: myRestaurants } = useFetch<readonly Restaurant[]>(token, "/api/restaurants");
  const navigate = useNavigate();

  const [places, setPlaces] = useState<readonly NearbyPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<ReadonlyMap<string, string>>(new Map());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(new Set());
  const fetchedRef = useRef(false);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);

  const hasFilters = search.trim() !== "" || cuisineFilter !== null;

  const clearFilters = () => {
    setSearch("");
    setCuisineFilter(null);
  };

  const cuisines = useMemo(() => {
    if (!places) return [];
    const set = new Set<string>();
    for (const p of places) {
      if (p.cuisine) set.add(p.cuisine);
    }
    return [...set].sort();
  }, [places]);

  const filteredPlaces = useMemo(() => {
    if (!places) return [];
    const q = search.toLowerCase().trim();
    return places.filter((p) => {
      if (dismissedIds.has(p.google_place_id)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.cuisine?.toLowerCase().includes(q))) {
        return false;
      }
      if (cuisineFilter && p.cuisine !== cuisineFilter) {
        return false;
      }
      return true;
    });
  }, [places, search, cuisineFilter, dismissedIds]);

  // Request geolocation when Nearby content mounts
  useEffect(() => {
    request();
  }, [request]);

  useEffect(() => {
    if (geo.status !== "ready" || fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    setError(null);

    post<readonly NearbyPlace[]>("/api/places/nearby", {
      latitude: geo.latitude,
      longitude: geo.longitude,
    })
      .then((data) => setPlaces(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to fetch nearby places"))
      .finally(() => setLoading(false));
  }, [geo, post]);

  const visiblePlaceIdMap = useMemo(
    () => new Map(
      (myRestaurants ?? [])
        .filter((r): r is Restaurant & { google_place_id: string } => r.google_place_id != null)
        .map((r) => [r.google_place_id, r.id])
    ),
    [myRestaurants]
  );

  const handleAdd = useCallback(
    async (place: NearbyPlace) => {
      setAddingId(place.google_place_id);
      try {
        const restaurant = await post<Restaurant>("/api/restaurants", {
          name: place.name,
          cuisine: place.cuisine,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          google_place_id: place.google_place_id,
        });
        track("nearby_place_added", { google_place_id: place.google_place_id });
        setAddedIds((prev) => new Map([...prev, [place.google_place_id, restaurant.id]]));
      } catch (err) {
        if (err instanceof Error && err.message.includes("already in your list")) {
          setAddedIds((prev) => new Map([...prev, [place.google_place_id, ""]]));
        } else {
          setError(err instanceof Error ? err.message : "Failed to add restaurant");
        }
      } finally {
        setAddingId(null);
      }
    },
    [post]
  );

  const handleRefresh = useCallback(() => {
    fetchedRef.current = false;
    setPlaces(null);
    setError(null);
    request();
  }, [request]);

  return (
    <>
      {/* Refresh button */}
      {places && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleRefresh}
            className="text-stone-500 hover:text-stone-300 p-2"
            aria-label="Refresh nearby restaurants"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      )}

      {/* Search + Cuisine Chips */}
      {places && places.length > 0 && (
        <>
          <div className="pb-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nearby..."
                className="w-full pl-9 pr-4 py-2.5 bg-stone-800/50 border border-stone-800 rounded-xl text-stone-50 text-sm placeholder:text-stone-500 focus:outline-none focus:border-coral-500/50 transition-colors"
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

          {cuisines.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
              <button
                onClick={() => setCuisineFilter(null)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  cuisineFilter === null
                    ? "bg-coral-500/20 text-coral-500 border border-coral-500/30"
                    : "bg-stone-800 text-stone-400 border border-stone-700"
                }`}
              >
                All
              </button>
              {cuisines.map((c) => (
                <button
                  key={c}
                  onClick={() => setCuisineFilter(cuisineFilter === c ? null : c)}
                  className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    cuisineFilter === c
                      ? "bg-coral-500/20 text-coral-500 border border-coral-500/30"
                      : "bg-stone-800 text-stone-400 border border-stone-700"
                  }`}
                >
                  {cuisineLabel(c)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Geolocation requesting */}
      {(geo.status === "idle" || geo.status === "requesting") && (
        <div className="flex flex-col items-center gap-3 py-16 text-stone-500">
          <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
          </svg>
          <p className="text-sm">Getting your location...</p>
        </div>
      )}

      {/* Geolocation denied */}
      {geo.status === "denied" && (
        <div className="text-center py-16">
          <p className="text-stone-400 text-sm">{geo.message}</p>
          <button
            onClick={request}
            className="mt-4 text-coral-500 text-sm font-medium hover:text-coral-500"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading places */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 text-coral-500 text-sm font-medium hover:text-coral-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {places && !loading && (
        <>
          {places.length === 0 ? (
            <p className="text-center text-stone-500 text-sm py-16">
              No restaurants found nearby
            </p>
          ) : filteredPlaces.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-400 text-sm">No matches found</p>
              <button
                onClick={clearFilters}
                className="text-coral-500 text-sm font-medium mt-3 hover:text-coral-500"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlaces.map((place) => {
                const restaurantId =
                  addedIds.get(place.google_place_id) ||
                  visiblePlaceIdMap.get(place.google_place_id) ||
                  null;
                return (
                  <DiscoverCard
                    key={place.google_place_id}
                    place={place}
                    isAdded={
                      visiblePlaceIdMap.has(place.google_place_id) ||
                      addedIds.has(place.google_place_id)
                    }
                    onAdd={() => handleAdd(place)}
                    adding={addingId === place.google_place_id}
                    onReview={() => restaurantId && navigate(`/restaurant/${restaurantId}`)}
                    onDismiss={() => setDismissedIds((prev) => new Set([...prev, place.google_place_id]))}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function DiscoverPage({ token }: DiscoverPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "nearby" ? "nearby" : "activity";
  const [activeTab, setActiveTab] = useState<DiscoverTab>(initialTab);

  const handleTabChange = (tab: DiscoverTab) => {
    track("discover_tab_changed", { tab });
    setActiveTab(tab);
    if (tab === "nearby") {
      setSearchParams({ tab: "nearby" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <h1 className="font-display text-2xl font-black text-coral-500 mb-4">Discover</h1>

      {/* Segmented Control */}
      <div className="flex bg-stone-900 rounded-xl p-1 mb-4">
        <button
          onClick={() => handleTabChange("activity")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "activity"
              ? "bg-coral-500 text-white"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => handleTabChange("nearby")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "nearby"
              ? "bg-coral-500 text-white"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Nearby
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "activity" ? (
        <ActivityFeed token={token} embedded />
      ) : (
        <NearbyContent token={token} />
      )}
    </div>
  );
}
