# Discover Nearby Restaurants — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Discover" tab that shows popular nearby restaurants from Google Places, enriched with Eat Sheet community ratings, with one-tap adding to the family's list.

**Architecture:** New `POST /api/places/nearby` endpoint calls Google Nearby Search API and cross-references results against all Eat Sheet restaurants (across families) by `google_place_id` to surface community ratings. New `DiscoverPage` client route with geolocation, result cards, and add flow. New 5th tab in BottomNav.

**Tech Stack:** Hono (server), Google Places API v1 `searchNearby`, React 19, Tailwind v4, navigator.geolocation

---

### Task 1: Server — `POST /api/places/nearby` endpoint

**Files:**
- Modify: `src/server/routes/places.ts` (add nearby endpoint after existing routes)

**Step 1: Write the failing test**

Add to `src/server/__tests__/places.test.ts`:

```typescript
describe("POST /api/places/nearby", () => {
  it("should require auth", async () => {
    const res = await app.request("/api/places/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
    }, mockEnv());
    expect(res.status).toBe(401);
  });

  it("should return 400 when latitude/longitude missing", async () => {
    const token = await makeToken();
    const res = await app.request("/api/places/nearby", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({}),
    }, mockEnv());
    expect(res.status).toBe(400);
  });

  it("should return 503 when API key not configured", async () => {
    const token = await makeToken();
    const res = await app.request("/api/places/nearby", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
    }, mockEnvNoKey());
    expect(res.status).toBe(503);
  });

  it("should return nearby places with community ratings", async () => {
    // Mock Google API response
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        places: [
          {
            id: "ChIJ_known",
            displayName: { text: "Known Place" },
            formattedAddress: "123 Main St",
            location: { latitude: 40.73, longitude: -74.00 },
            types: ["italian_restaurant", "restaurant"],
            rating: 4.5,
            userRatingCount: 200,
            googleMapsUri: "https://maps.google.com/?cid=1",
          },
          {
            id: "ChIJ_new",
            displayName: { text: "New Place" },
            formattedAddress: "456 Oak Ave",
            location: { latitude: 40.74, longitude: -74.01 },
            types: ["mexican_restaurant"],
            rating: 4.2,
            userRatingCount: 85,
            googleMapsUri: "https://maps.google.com/?cid=2",
          },
        ],
      }), { status: 200 })
    );

    // Mock DB: "ChIJ_known" exists in DB with a rating
    const { db } = createMockDb([
      {
        sql: "google_place_id IN",
        results: [
          { google_place_id: "ChIJ_known", avg_score: 8.2, review_count: 3 },
        ],
      },
    ]);

    const token = await makeToken();
    const res = await app.request("/api/places/nearby", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
    }, { ...mockEnv(db), DB: db });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(2);

    // Known place should have community rating
    const known = body.data.find((p: any) => p.google_place_id === "ChIJ_known");
    expect(known.name).toBe("Known Place");
    expect(known.cuisine).toBe("Italian");
    expect(known.google_rating).toBe(4.5);
    expect(known.google_rating_count).toBe(200);
    expect(known.eat_sheet_score).toBe(8.2);
    expect(known.eat_sheet_reviews).toBe(3);

    // New place should have null community rating
    const newPlace = body.data.find((p: any) => p.google_place_id === "ChIJ_new");
    expect(newPlace.eat_sheet_score).toBeNull();
    expect(newPlace.eat_sheet_reviews).toBe(0);

    // Verify Google API was called correctly
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toContain("searchNearby");
    const fetchBody = JSON.parse(fetchCall[1].body);
    expect(fetchBody.locationRestriction.circle.center.latitude).toBe(40.7);
    expect(fetchBody.maxResultCount).toBe(20);
  });

  it("should handle Google API errors gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response("Server error", { status: 500 })
    );

    const token = await makeToken();
    const res = await app.request("/api/places/nearby", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
    }, mockEnv());

    expect(res.status).toBe(502);
  });

  it("should return empty array when no places found", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );

    const token = await makeToken();
    const res = await app.request("/api/places/nearby", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
    }, mockEnv());

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/places.test.ts`
Expected: FAIL — no `/api/places/nearby` route

**Step 3: Write the implementation**

Add to `src/server/routes/places.ts` before the export:

```typescript
// POST /api/places/nearby — discover popular restaurants near a location
places.post("/nearby", async (c) => {
  const apiKey = c.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Places API not configured" }, 503);
  }

  const body = await c.req.json<{
    latitude?: number;
    longitude?: number;
  }>();

  if (body.latitude == null || body.longitude == null) {
    return c.json({ error: "latitude and longitude are required" }, 400);
  }

  const res = await fetch(`${GOOGLE_API_BASE}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.googleMapsUri",
    },
    body: JSON.stringify({
      includedPrimaryTypes: ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude: body.latitude, longitude: body.longitude },
          radius: 5000.0,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Places nearby]", res.status, text);
    return c.json({ error: "Places API error" }, 502);
  }

  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      types?: string[];
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
    }>;
  };

  const googlePlaces = data.places ?? [];

  if (googlePlaces.length === 0) {
    return c.json({ data: [] });
  }

  // Cross-reference with Eat Sheet community ratings (all families)
  const placeIds = googlePlaces.map((p) => p.id);
  const placeholders = placeIds.map(() => "?").join(",");
  const { results: communityData } = await c.env.DB.prepare(
    `SELECT r.google_place_id,
            ROUND(AVG(rv.overall_score), 1) as avg_score,
            COUNT(rv.id) as review_count
     FROM restaurants r
     LEFT JOIN reviews rv ON rv.restaurant_id = r.id
     WHERE r.google_place_id IN (${placeholders})
     GROUP BY r.google_place_id`
  )
    .bind(...placeIds)
    .all();

  const communityMap = new Map<string, { avg_score: number | null; review_count: number }>();
  for (const row of communityData ?? []) {
    const r = row as { google_place_id: string; avg_score: number | null; review_count: number };
    communityMap.set(r.google_place_id, {
      avg_score: r.avg_score,
      review_count: r.review_count,
    });
  }

  const results = googlePlaces.map((place) => {
    const community = communityMap.get(place.id);
    return {
      google_place_id: place.id,
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      cuisine: mapTypeToCuisine(place.types ?? []),
      google_rating: place.rating ?? null,
      google_rating_count: place.userRatingCount ?? 0,
      google_maps_uri: place.googleMapsUri ?? null,
      eat_sheet_score: community?.avg_score ?? null,
      eat_sheet_reviews: community?.review_count ?? 0,
    };
  });

  return c.json({ data: results });
});
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/__tests__/places.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/server/routes/places.ts src/server/__tests__/places.test.ts
git commit -m "feat: add POST /api/places/nearby endpoint with community ratings"
```

---

### Task 2: Client type + DiscoverPage component

**Files:**
- Modify: `src/client/types.ts` (add NearbyPlace interface)
- Create: `src/client/components/DiscoverPage.tsx`

**Step 1: Add the NearbyPlace type**

Add to `src/client/types.ts`:

```typescript
export interface NearbyPlace {
  readonly google_place_id: string;
  readonly name: string;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly cuisine: string | null;
  readonly google_rating: number | null;
  readonly google_rating_count: number;
  readonly google_maps_uri: string | null;
  readonly eat_sheet_score: number | null;
  readonly eat_sheet_reviews: number;
}
```

**Step 2: Create DiscoverPage component**

Create `src/client/components/DiscoverPage.tsx`:

```tsx
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
```

**Step 3: Run build to verify no type errors**

Run: `npm run build`
Expected: PASS (component is not yet routed, but should compile)

**Step 4: Commit**

```bash
git add src/client/types.ts src/client/components/DiscoverPage.tsx
git commit -m "feat: add DiscoverPage component with geolocation and add flow"
```

---

### Task 3: Wire up routing + BottomNav

**Files:**
- Modify: `src/client/App.tsx` (add lazy import + route)
- Modify: `src/client/components/BottomNav.tsx` (add Discover tab)

**Step 1: Add Discover route to App.tsx**

After the existing lazy imports (~line 32), add:

```typescript
const DiscoverPage = lazy(() =>
  import("./components/DiscoverPage").then((m) => ({ default: m.DiscoverPage }))
);
```

Inside `<Routes>`, after the `/stats` route and before the `/settings` route, add:

```tsx
<Route
  path="/discover"
  element={<DiscoverPage token={auth.token} />}
/>
```

**Step 2: Add Discover tab to BottomNav**

Insert a new tab object after the "stats" entry and before "settings" in the `tabs` array:

```typescript
{
  key: "discover",
  label: "Discover",
  path: "/discover",
  icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
},
```

This is a compass icon — matches the "discover/explore" metaphor.

**Step 3: Build and verify**

Run: `npm run build`
Expected: PASS, no errors

**Step 4: Commit**

```bash
git add src/client/App.tsx src/client/components/BottomNav.tsx
git commit -m "feat: wire up Discover tab in BottomNav and routing"
```

---

### Task 4: Verify all tests pass + final build

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit any fixes if needed, then deploy**

```bash
# If all good, no extra commit needed
```
