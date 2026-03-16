import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";
import { mapTypeToCuisine } from "../utils/cuisine-types";

const restaurants = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

restaurants.use("*", authMiddleware);

restaurants.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `${visiblePeersCte()}
       SELECT r.*,
              ROUND(AVG(rv.overall_score), 1) as avg_score,
              COUNT(rv.id) as review_count,
              m.name as creator_name,
              MAX(rv.visited_at) as last_visited_at,
              (SELECT COUNT(*) FROM bookmarks b WHERE b.restaurant_id = r.id) as bookmark_count
       FROM restaurants r
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       LEFT JOIN members m ON m.id = r.created_by
       WHERE r.created_by IN (SELECT member_id FROM visible_peers)
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    )
    .bind(payload.member_id, payload.member_id)
    .all();

  return c.json({ data: results });
});

restaurants.get("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const db = c.env.DB;

  const restaurant = await db
    .prepare(
      `${visiblePeersCte()}
       SELECT r.*,
              ROUND(AVG(rv.overall_score), 1) as avg_score,
              COUNT(rv.id) as review_count,
              ROUND(AVG(rv.food_score), 1) as avg_food,
              ROUND(AVG(rv.service_score), 1) as avg_service,
              ROUND(AVG(rv.ambiance_score), 1) as avg_ambiance,
              ROUND(AVG(rv.value_score), 1) as avg_value
       FROM restaurants r
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE r.id = ? AND r.created_by IN (SELECT member_id FROM visible_peers)
       GROUP BY r.id`
    )
    .bind(payload.member_id, payload.member_id, id)
    .first();

  if (!restaurant) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  const [reviewsResult, reactionsResult, photosResult] = await db.batch([
    db.prepare(
      `SELECT rv.*, m.name as member_name
       FROM reviews rv
       JOIN members m ON m.id = rv.member_id
       WHERE rv.restaurant_id = ?
       ORDER BY rv.created_at DESC`
    ).bind(id),
    db.prepare(
      `SELECT rc.review_id, rc.emoji, rc.member_id, m.name as member_name
       FROM reactions rc
       JOIN members m ON m.id = rc.member_id
       WHERE rc.review_id IN (SELECT id FROM reviews WHERE restaurant_id = ?)`
    ).bind(id),
    db.prepare(
      `SELECT review_id, photo_url, sort_order
       FROM review_photos
       WHERE review_id IN (SELECT id FROM reviews WHERE restaurant_id = ?)
       ORDER BY sort_order ASC`
    ).bind(id),
  ]);

  const reviews = reviewsResult?.results ?? [];
  const allReactions = (reactionsResult?.results ?? []) as { review_id: string; emoji: string; member_id: string; member_name: string }[];
  const allPhotos = (photosResult?.results ?? []) as { review_id: string; photo_url: string; sort_order: number }[];

  // Group reactions by review_id
  const reactionsByReview = new Map<string, Array<{ emoji: string; member_id: string; member_name: string }>>();
  for (const rc of allReactions) {
    const list = reactionsByReview.get(rc.review_id) ?? [];
    list.push({ emoji: rc.emoji, member_id: rc.member_id, member_name: rc.member_name });
    reactionsByReview.set(rc.review_id, list);
  }

  // Group photos by review_id
  const photosByReview = new Map<string, string[]>();
  for (const p of allPhotos) {
    const list = photosByReview.get(p.review_id) ?? [];
    list.push(p.photo_url);
    photosByReview.set(p.review_id, list);
  }

  const reviewsWithReactions = (reviews as Array<Record<string, unknown>>).map((rv) => ({
    ...rv,
    reactions: reactionsByReview.get(rv.id as string) ?? [],
    photo_urls: photosByReview.get(rv.id as string) ?? [],
  }));

  return c.json({ data: { ...restaurant, reviews: reviewsWithReactions } });
});

restaurants.post("/import", async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{
    restaurants: Array<{
      name: string;
      cuisine?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      google_place_id?: string;
    }>;
  }>();

  const items = body.restaurants;
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: "Must provide at least one restaurant" }, 400);
  }
  if (items.length > 50) {
    return c.json({ error: "Maximum 50 restaurants per import" }, 400);
  }
  for (const item of items) {
    if (!item.name?.trim()) {
      return c.json({ error: "Every restaurant must have a name" }, 400);
    }
  }

  const db = c.env.DB;

  // Batch duplicate check for items with google_place_id
  const placeIds = items
    .map((r) => r.google_place_id?.trim())
    .filter((id): id is string => !!id);

  const existingMap = new Map<string, string>();
  if (placeIds.length > 0) {
    const placeholders = placeIds.map(() => "?").join(",");
    const { results } = await db
      .prepare(
        `${visiblePeersCte()}
         SELECT id, google_place_id FROM restaurants
         WHERE google_place_id IN (${placeholders}) AND created_by IN (SELECT member_id FROM visible_peers)`
      )
      .bind(payload.member_id, payload.member_id, ...placeIds)
      .all<{ id: string; google_place_id: string }>();

    for (const row of results) {
      existingMap.set(row.google_place_id, row.id);
    }
  }

  // Build results and INSERT statements for non-duplicates
  type ImportResult = { name: string; id: string | null; status: "created" | "duplicate" };
  const results: ImportResult[] = [];
  const insertStmts: ReturnType<D1Database["prepare"]>[] = [];
  const insertIndices: number[] = [];

  for (const [i, item] of items.entries()) {
    const gpid = item.google_place_id?.trim() || null;

    if (gpid && existingMap.has(gpid)) {
      results.push({ name: item.name.trim(), id: existingMap.get(gpid)!, status: "duplicate" });
    } else {
      results.push({ name: item.name.trim(), id: null, status: "created" });
      insertStmts.push(
        db
          .prepare(
            `INSERT INTO restaurants (family_id, name, cuisine, address, latitude, longitude, google_place_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id, name`
          )
          .bind(
            "legacy",
            item.name.trim(),
            item.cuisine?.trim() || null,
            item.address?.trim() || null,
            item.latitude ?? null,
            item.longitude ?? null,
            gpid,
            payload.member_id
          )
      );
      insertIndices.push(i);
    }
  }

  // Execute batch insert
  if (insertStmts.length > 0) {
    const batchResults = await db.batch(insertStmts);
    for (const [j, batchResult] of batchResults.entries()) {
      const row = batchResult.results?.[0] as { id: string } | undefined;
      const idx = insertIndices[j];
      const resultEntry = idx !== undefined ? results[idx] : undefined;
      if (row && resultEntry) {
        resultEntry.id = row.id;
      }
    }
  }

  const imported = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "duplicate").length;

  return c.json({ data: { imported, skipped, results } });
});

restaurants.post("/", async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{
    name: string;
    cuisine?: string;
    address?: string;
    photo_url?: string;
    latitude?: number;
    longitude?: number;
    google_place_id?: string;
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Restaurant name is required" }, 400);
  }

  const db = c.env.DB;
  const googlePlaceId = body.google_place_id?.trim() || null;

  // Duplicate detection: same google_place_id among visible peers
  if (googlePlaceId) {
    const duplicate = await db
      .prepare(
        `${visiblePeersCte()}
         SELECT id, name FROM restaurants
         WHERE google_place_id = ? AND created_by IN (SELECT member_id FROM visible_peers)`
      )
      .bind(payload.member_id, payload.member_id, googlePlaceId)
      .first<{ id: string; name: string }>();

    if (duplicate) {
      return c.json({
        error: `"${duplicate.name}" is already in your list`,
        duplicate_id: duplicate.id,
      }, 409);
    }
  }

  // Use a placeholder family_id for the legacy column
  const restaurant = await db
    .prepare(
      `INSERT INTO restaurants (family_id, name, cuisine, address, photo_url, latitude, longitude, google_place_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      "legacy",
      body.name.trim(),
      body.cuisine?.trim() || null,
      body.address?.trim() || null,
      body.photo_url?.trim() || null,
      body.latitude ?? null,
      body.longitude ?? null,
      googlePlaceId,
      payload.member_id
    )
    .first();

  // Auto-enrich: if no coords, attempt Google Places lookup in the background
  if (restaurant && body.latitude == null && body.longitude == null) {
    const apiKey = c.env.GOOGLE_PLACES_API_KEY;
    const restaurantId = (restaurant as Record<string, unknown>).id as string;
    const restaurantName = body.name.trim();

    if (apiKey) {
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const GOOGLE_API_BASE = "https://places.googleapis.com/v1";
            const res = await fetch(`${GOOGLE_API_BASE}/places:searchText`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask":
                  "places.id,places.displayName,places.formattedAddress,places.location,places.types",
              },
              body: JSON.stringify({
                textQuery: restaurantName,
                maxResultCount: 1,
              }),
            });
            if (!res.ok) return;

            const data = (await res.json()) as {
              places?: Array<{
                id: string;
                formattedAddress?: string;
                location?: { latitude: number; longitude: number };
                types?: string[];
              }>;
            };
            const place = data.places?.[0];
            if (!place?.location) return;

            const cuisine = mapTypeToCuisine(place.types ?? []);

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
                cuisine,
                place.id,
                restaurantId
              )
              .run();
          } catch {
            // Best-effort enrichment — don't fail the create
          }
        })()
      );
    }
  }

  return c.json({ data: restaurant }, 201);
});

restaurants.put("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const body = await c.req.json<{
    name: string;
    cuisine?: string;
    address?: string;
    photo_url?: string;
    latitude?: number | null;
    longitude?: number | null;
    google_place_id?: string | null;
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Restaurant name is required" }, 400);
  }

  const db = c.env.DB;
  const existing = await db
    .prepare(
      `${visiblePeersCte()}
       SELECT id FROM restaurants WHERE id = ? AND created_by IN (SELECT member_id FROM visible_peers)`
    )
    .bind(payload.member_id, payload.member_id, id)
    .first();

  if (!existing) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  const googlePlaceId = body.google_place_id?.trim() || null;

  const restaurant = await db
    .prepare(
      `UPDATE restaurants
       SET name = ?, cuisine = ?, address = ?, photo_url = ?, latitude = ?, longitude = ?, google_place_id = ?
       WHERE id = ?
       RETURNING *`
    )
    .bind(
      body.name.trim(),
      body.cuisine?.trim() || null,
      body.address?.trim() || null,
      body.photo_url?.trim() || null,
      body.latitude ?? null,
      body.longitude ?? null,
      googlePlaceId,
      id
    )
    .first();

  return c.json({ data: restaurant });
});

restaurants.delete("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const db = c.env.DB;

  const restaurant = await db
    .prepare(
      `${visiblePeersCte()}
       SELECT id, created_by FROM restaurants WHERE id = ? AND created_by IN (SELECT member_id FROM visible_peers)`
    )
    .bind(payload.member_id, payload.member_id, id)
    .first();

  if (!restaurant) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  if (restaurant.created_by !== payload.member_id) {
    return c.json({ error: "Only the creator can delete this restaurant" }, 403);
  }

  await db.batch([
    db.prepare("DELETE FROM reviews WHERE restaurant_id = ?").bind(id),
    db.prepare("DELETE FROM restaurants WHERE id = ?").bind(id),
  ]);

  return c.json({ data: { deleted: true } });
});

export { restaurants as restaurantRoutes };
