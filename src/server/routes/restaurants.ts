import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const restaurants = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

restaurants.use("*", authMiddleware);

restaurants.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT r.*,
              ROUND(AVG(rv.overall_score), 1) as avg_score,
              COUNT(rv.id) as review_count,
              m.name as creator_name,
              MAX(rv.visited_at) as last_visited_at,
              (SELECT COUNT(*) FROM bookmarks b WHERE b.restaurant_id = r.id) as bookmark_count
       FROM restaurants r
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       LEFT JOIN members m ON m.id = r.created_by
       WHERE r.family_id = ?
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    )
    .bind(payload.family_id)
    .all();

  return c.json({ data: results });
});

restaurants.get("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const db = c.env.DB;

  const restaurant = await db
    .prepare(
      `SELECT r.*,
              ROUND(AVG(rv.overall_score), 1) as avg_score,
              COUNT(rv.id) as review_count,
              ROUND(AVG(rv.food_score), 1) as avg_food,
              ROUND(AVG(rv.service_score), 1) as avg_service,
              ROUND(AVG(rv.ambiance_score), 1) as avg_ambiance,
              ROUND(AVG(rv.value_score), 1) as avg_value
       FROM restaurants r
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE r.id = ? AND r.family_id = ?
       GROUP BY r.id`
    )
    .bind(id, payload.family_id)
    .first();

  if (!restaurant) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  const { results: reviews } = await db
    .prepare(
      `SELECT rv.*, m.name as member_name
       FROM reviews rv
       JOIN members m ON m.id = rv.member_id
       WHERE rv.restaurant_id = ?
       ORDER BY rv.created_at DESC`
    )
    .bind(id)
    .all();

  // Fetch reactions for all reviews
  const { results: allReactions } = await db
    .prepare(
      `SELECT rc.review_id, rc.emoji, rc.member_id, m.name as member_name
       FROM reactions rc
       JOIN members m ON m.id = rc.member_id
       WHERE rc.review_id IN (SELECT id FROM reviews WHERE restaurant_id = ?)`
    )
    .bind(id)
    .all<{ review_id: string; emoji: string; member_id: string; member_name: string }>();

  // Fetch photos for all reviews
  const { results: allPhotos } = await db
    .prepare(
      `SELECT review_id, photo_url, sort_order
       FROM review_photos
       WHERE review_id IN (SELECT id FROM reviews WHERE restaurant_id = ?)
       ORDER BY sort_order ASC`
    )
    .bind(id)
    .all<{ review_id: string; photo_url: string; sort_order: number }>();

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

restaurants.post("/", async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{
    name: string;
    cuisine?: string;
    address?: string;
    photo_url?: string;
    latitude?: number;
    longitude?: number;
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Restaurant name is required" }, 400);
  }

  const db = c.env.DB;
  const restaurant = await db
    .prepare(
      `INSERT INTO restaurants (family_id, name, cuisine, address, photo_url, latitude, longitude, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      payload.family_id,
      body.name.trim(),
      body.cuisine?.trim() || null,
      body.address?.trim() || null,
      body.photo_url?.trim() || null,
      body.latitude ?? null,
      body.longitude ?? null,
      payload.member_id
    )
    .first();

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
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Restaurant name is required" }, 400);
  }

  const db = c.env.DB;
  const existing = await db
    .prepare("SELECT id FROM restaurants WHERE id = ? AND family_id = ?")
    .bind(id, payload.family_id)
    .first();

  if (!existing) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  const restaurant = await db
    .prepare(
      `UPDATE restaurants
       SET name = ?, cuisine = ?, address = ?, photo_url = ?, latitude = ?, longitude = ?
       WHERE id = ? AND family_id = ?
       RETURNING *`
    )
    .bind(
      body.name.trim(),
      body.cuisine?.trim() || null,
      body.address?.trim() || null,
      body.photo_url?.trim() || null,
      body.latitude ?? null,
      body.longitude ?? null,
      id,
      payload.family_id
    )
    .first();

  return c.json({ data: restaurant });
});

restaurants.delete("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const db = c.env.DB;

  const restaurant = await db
    .prepare("SELECT id, created_by FROM restaurants WHERE id = ? AND family_id = ?")
    .bind(id, payload.family_id)
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
