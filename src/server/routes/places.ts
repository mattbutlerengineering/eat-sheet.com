import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";

const places = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

places.use("*", authMiddleware);

const GOOGLE_API_BASE = "https://places.googleapis.com/v1";

// Maps Google place types to our cuisine categories
const TYPE_TO_CUISINE: Record<string, string> = {
  italian_restaurant: "Italian",
  pizza_restaurant: "Pizza",
  japanese_restaurant: "Japanese",
  chinese_restaurant: "Chinese",
  mexican_restaurant: "Mexican",
  indian_restaurant: "Indian",
  thai_restaurant: "Thai",
  french_restaurant: "French",
  korean_restaurant: "Korean",
  vietnamese_restaurant: "Vietnamese",
  greek_restaurant: "Greek",
  mediterranean_restaurant: "Mediterranean",
  brazilian_restaurant: "Brazilian",
  middle_eastern_restaurant: "Middle Eastern",
  barbecue_restaurant: "Barbecue",
  seafood_restaurant: "Seafood",
  american_restaurant: "American",
};

function mapTypeToCuisine(types: readonly string[]): string | null {
  for (const t of types) {
    const cuisine = TYPE_TO_CUISINE[t];
    if (cuisine) return cuisine;
  }
  return null;
}

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

  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return c.json({ error: "Valid latitude and longitude are required" }, 400);
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
          center: { latitude: lat, longitude: lng },
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

// POST /api/places/autocomplete
places.post("/autocomplete", async (c) => {
  const apiKey = c.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Places API not configured" }, 503);
  }

  const body = await c.req.json<{
    input: string;
    latitude?: number;
    longitude?: number;
    sessionToken?: string;
  }>();

  if (!body.input?.trim()) {
    return c.json({ error: "Search input is required" }, 400);
  }

  const requestBody: Record<string, unknown> = {
    input: body.input.trim(),
    includedPrimaryTypes: ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
  };

  if (body.latitude != null && body.longitude != null) {
    requestBody.locationBias = {
      circle: {
        center: { latitude: body.latitude, longitude: body.longitude },
        radius: 50000.0,
      },
    };
  }

  if (body.sessionToken) {
    requestBody.sessionToken = body.sessionToken;
  }

  const res = await fetch(`${GOOGLE_API_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Places autocomplete]", res.status, text);
    return c.json({ error: "Places API error" }, 502);
  }

  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        text: { text: string };
        structuredFormat?: {
          mainText: { text: string };
          secondaryText?: { text: string };
        };
      };
    }>;
  };

  const suggestions = (data.suggestions ?? [])
    .filter((s) => s.placePrediction != null)
    .map((s) => {
      const p = s.placePrediction!;
      return {
        place_id: p.placeId,
        name: p.structuredFormat?.mainText.text ?? p.text.text,
        secondary_text: p.structuredFormat?.secondaryText?.text ?? null,
      };
    });

  return c.json({ data: suggestions });
});

// GET /api/places/:placeId
places.get("/:placeId", async (c) => {
  const apiKey = c.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Places API not configured" }, 503);
  }

  const placeId = c.req.param("placeId");
  const sessionToken = c.req.query("sessionToken");

  const url = new URL(`${GOOGLE_API_BASE}/places/${placeId}`);
  if (sessionToken) {
    url.searchParams.set("sessionToken", sessionToken);
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,types,googleMapsUri",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Places detail]", res.status, text);
    return c.json({ error: "Places API error" }, 502);
  }

  const place = (await res.json()) as {
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    types?: string[];
    googleMapsUri?: string;
  };

  return c.json({
    data: {
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      google_place_id: place.id,
      google_maps_uri: place.googleMapsUri ?? null,
      cuisine: mapTypeToCuisine(place.types ?? []),
      types: place.types ?? [],
    },
  });
});

export { places as placesRoutes };
