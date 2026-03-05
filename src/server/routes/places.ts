import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const places = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
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
