import { useState, useEffect, useCallback, useRef } from "react";
import { useApi, useFetch } from "../hooks/useApi";
import type { NearbyPlace, Restaurant } from "../types";

interface DiscoverPageProps {
  readonly token: string;
}

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "denied"; message: string }
  | { status: "ready"; latitude: number; longitude: number };

function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "denied", message: "Geolocation is not supported by your browser" });
      return;
    }
    setGeo({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: "ready",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Enable it in your browser settings to discover nearby restaurants."
            : "Could not determine your location. Please try again.";
        setGeo({ status: "denied", message });
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
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
}: {
  readonly place: NearbyPlace;
  readonly isAdded: boolean;
  readonly onAdd: () => void;
  readonly adding: boolean;
}) {
  return (
    <div className="bg-stone-900 rounded-xl p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-stone-100 truncate">{place.name}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {place.cuisine && (
            <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
              {place.cuisine}
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
      <button
        onClick={onAdd}
        disabled={isAdded || adding}
        aria-label={isAdded ? `${place.name} already added` : `Add ${place.name}`}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isAdded
            ? "bg-green-500/20 text-green-400 cursor-default"
            : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 active:scale-95"
        }`}
      >
        {adding ? (
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
          </svg>
        ) : isAdded ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function DiscoverPage({ token }: DiscoverPageProps) {
  const { geo, request } = useGeolocation();
  const { post } = useApi(token);
  const { data: myRestaurants } = useFetch<readonly Restaurant[]>(token, "/api/restaurants");

  const [places, setPlaces] = useState<readonly NearbyPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<ReadonlySet<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Auto-request geolocation on mount
  useEffect(() => {
    request();
  }, [request]);

  // Fetch nearby places once we have coords
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

  // Build set of google_place_ids already in family
  const familyPlaceIds = new Set(
    (myRestaurants ?? [])
      .map((r) => r.google_place_id)
      .filter((id): id is string => id != null)
  );

  const handleAdd = useCallback(
    async (place: NearbyPlace) => {
      setAddingId(place.google_place_id);
      try {
        await post("/api/restaurants", {
          name: place.name,
          cuisine: place.cuisine,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          google_place_id: place.google_place_id,
        });
        setAddedIds((prev) => new Set([...prev, place.google_place_id]));
      } catch (err) {
        // 409 = duplicate, treat as already added
        if (err instanceof Error && err.message.includes("already in your list")) {
          setAddedIds((prev) => new Set([...prev, place.google_place_id]));
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
    request();
  }, [request]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-black text-orange-500">Discover</h1>
          <p className="text-stone-500 text-sm">Popular restaurants nearby</p>
        </div>
        {places && (
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
        )}
      </div>

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
            className="mt-4 text-orange-500 text-sm font-medium hover:text-orange-400"
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
            className="mt-4 text-orange-500 text-sm font-medium hover:text-orange-400"
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
          ) : (
            <div className="space-y-3">
              {places.map((place) => (
                <DiscoverCard
                  key={place.google_place_id}
                  place={place}
                  isAdded={
                    familyPlaceIds.has(place.google_place_id) ||
                    addedIds.has(place.google_place_id)
                  }
                  onAdd={() => handleAdd(place)}
                  adding={addingId === place.google_place_id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
