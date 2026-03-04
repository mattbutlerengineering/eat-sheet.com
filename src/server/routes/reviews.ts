import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const reviews = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

reviews.use("*", authMiddleware);

reviews.post("/:restaurantId", async (c) => {
  const payload = c.get("jwtPayload");
  const restaurantId = c.req.param("restaurantId");
  const body = await c.req.json<{
    overall_score: number;
    food_score?: number;
    service_score?: number;
    ambiance_score?: number;
    value_score?: number;
    notes?: string;
    photo_url?: string;
    visited_at?: string;
  }>();

  if (!body.overall_score || body.overall_score < 1 || body.overall_score > 10) {
    return c.json({ error: "Overall score must be between 1 and 10" }, 400);
  }

  const db = c.env.DB;

  const restaurant = await db
    .prepare("SELECT id FROM restaurants WHERE id = ? AND family_id = ?")
    .bind(restaurantId, payload.family_id)
    .first();

  if (!restaurant) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  const existing = await db
    .prepare("SELECT id FROM reviews WHERE restaurant_id = ? AND member_id = ?")
    .bind(restaurantId, payload.member_id)
    .first();

  if (existing) {
    return c.json({ error: "You already have a review for this restaurant. Use PUT to update." }, 409);
  }

  const review = await db
    .prepare(
      `INSERT INTO reviews (restaurant_id, member_id, overall_score, food_score, service_score, ambiance_score, value_score, notes, photo_url, visited_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      restaurantId,
      payload.member_id,
      body.overall_score,
      body.food_score ?? null,
      body.service_score ?? null,
      body.ambiance_score ?? null,
      body.value_score ?? null,
      body.notes?.trim() || null,
      body.photo_url?.trim() || null,
      body.visited_at || null
    )
    .first();

  return c.json({ data: review }, 201);
});

reviews.put("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const body = await c.req.json<{
    overall_score: number;
    food_score?: number | null;
    service_score?: number | null;
    ambiance_score?: number | null;
    value_score?: number | null;
    notes?: string | null;
    photo_url?: string | null;
    visited_at?: string | null;
  }>();

  if (!body.overall_score || body.overall_score < 1 || body.overall_score > 10) {
    return c.json({ error: "Overall score must be between 1 and 10" }, 400);
  }

  const db = c.env.DB;

  const existing = await db
    .prepare("SELECT id FROM reviews WHERE id = ? AND member_id = ?")
    .bind(id, payload.member_id)
    .first();

  if (!existing) {
    return c.json({ error: "Review not found or not yours" }, 404);
  }

  const review = await db
    .prepare(
      `UPDATE reviews
       SET overall_score = ?, food_score = ?, service_score = ?, ambiance_score = ?, value_score = ?, notes = ?, photo_url = ?, visited_at = ?, updated_at = datetime('now')
       WHERE id = ? AND member_id = ?
       RETURNING *`
    )
    .bind(
      body.overall_score,
      body.food_score ?? null,
      body.service_score ?? null,
      body.ambiance_score ?? null,
      body.value_score ?? null,
      body.notes?.trim() || null,
      body.photo_url?.trim() || null,
      body.visited_at || null,
      id,
      payload.member_id
    )
    .first();

  return c.json({ data: review });
});

reviews.delete("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const db = c.env.DB;

  const existing = await db
    .prepare("SELECT id FROM reviews WHERE id = ? AND member_id = ?")
    .bind(id, payload.member_id)
    .first();

  if (!existing) {
    return c.json({ error: "Review not found or not yours" }, 404);
  }

  await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();

  return c.json({ data: { deleted: true } });
});

export { reviews as reviewRoutes };
