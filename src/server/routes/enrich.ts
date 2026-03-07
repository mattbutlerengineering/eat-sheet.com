import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";

const enrich = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

enrich.use("*", authMiddleware);

const GOOGLE_API_BASE = "https://places.googleapis.com/v1";
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.types";

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

interface PlaceResult {
  readonly id: string;
  readonly displayName?: { readonly text: string };
  readonly formattedAddress?: string;
  readonly location?: { readonly latitude: number; readonly longitude: number };
  readonly types?: readonly string[];
}

interface EnrichResult {
  readonly id: string;
  readonly name: string;
  readonly status: "enriched" | "skipped" | "failed";
  readonly matched_name?: string;
  readonly address?: string;
  readonly error?: string;
}

async function fetchPlaceById(
  placeId: string,
  apiKey: string
): Promise<PlaceResult | null> {
  const res = await fetch(`${GOOGLE_API_BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types",
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as PlaceResult;
}

async function searchPlaceByName(
  name: string,
  apiKey: string
): Promise<PlaceResult | null> {
  const res = await fetch(`${GOOGLE_API_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: name,
      maxResultCount: 1,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { places?: readonly PlaceResult[] };
  return data.places?.[0] ?? null;
}

// POST /api/admin/enrich — backfill missing restaurant data
enrich.post("/enrich", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  // Admin check: member-level OR any group admin
  const adminCheck = await db
    .prepare(
      `SELECT 1 as is_admin FROM members WHERE id = ? AND is_admin = 1
       UNION
       SELECT 1 FROM group_members WHERE member_id = ? AND is_admin = 1
       LIMIT 1`
    )
    .bind(payload.member_id, payload.member_id)
    .first<{ is_admin: number }>();

  if (!adminCheck) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const apiKey = c.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Google Places API not configured" }, 503);
  }

  const body = await c.req.json<{
    dry_run?: boolean;
    limit?: number;
  }>();

  const dryRun = body.dry_run ?? false;
  const limit = Math.min(Math.max(body.limit ?? 50, 1), 100);

  // Find restaurants missing coordinates
  const { results: restaurants } = await db
    .prepare(
      `SELECT id, name, cuisine, google_place_id
       FROM restaurants
       WHERE latitude IS NULL OR longitude IS NULL
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<{
      id: string;
      name: string;
      cuisine: string | null;
      google_place_id: string | null;
    }>();

  if (restaurants.length === 0) {
    return c.json({
      data: { enriched: 0, skipped: 0, failed: 0, details: [] },
    });
  }

  const details: EnrichResult[] = [];
  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    let place: PlaceResult | null = null;

    try {
      if (restaurant.google_place_id) {
        place = await fetchPlaceById(restaurant.google_place_id, apiKey);
      } else {
        place = await searchPlaceByName(restaurant.name, apiKey);
      }
    } catch {
      failed++;
      details.push({
        id: restaurant.id,
        name: restaurant.name,
        status: "failed",
        error: "API request failed",
      });
      continue;
    }

    if (!place?.location) {
      skipped++;
      details.push({
        id: restaurant.id,
        name: restaurant.name,
        status: "skipped",
        error: "No match found",
      });
      continue;
    }

    if (!dryRun) {
      await db
        .prepare(
          `UPDATE restaurants
           SET address = COALESCE(address, ?),
               latitude = ?,
               longitude = ?,
               cuisine = COALESCE(cuisine, ?),
               google_place_id = COALESCE(google_place_id, ?)
           WHERE id = ?`
        )
        .bind(
          place.formattedAddress ?? null,
          place.location.latitude,
          place.location.longitude,
          mapTypeToCuisine(place.types ?? []),
          place.id,
          restaurant.id
        )
        .run();
    }

    enriched++;
    details.push({
      id: restaurant.id,
      name: restaurant.name,
      status: "enriched",
      matched_name: place.displayName?.text,
      address: place.formattedAddress ?? undefined,
    });
  }

  return c.json({ data: { enriched, skipped, failed, details } });
});

// GET /api/admin/enrich/status — count restaurants needing enrichment
enrich.get("/enrich/status", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const adminCheck = await db
    .prepare(
      `SELECT 1 as is_admin FROM members WHERE id = ? AND is_admin = 1
       UNION
       SELECT 1 FROM group_members WHERE member_id = ? AND is_admin = 1
       LIMIT 1`
    )
    .bind(payload.member_id, payload.member_id)
    .first<{ is_admin: number }>();

  if (!adminCheck) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM restaurants
       WHERE latitude IS NULL OR longitude IS NULL`
    )
    .first<{ count: number }>();

  return c.json({ data: { missing_count: row?.count ?? 0 } });
});

export { enrich as enrichRoutes };
