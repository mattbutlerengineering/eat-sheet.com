import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const MAX_PHOTOS = 5;

const reviews = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

reviews.use("*", authMiddleware);

async function saveReviewPhotos(
  db: D1Database,
  reviewId: string,
  photoUrls: readonly string[]
): Promise<void> {
  // Delete existing photos for this review
  await db.prepare("DELETE FROM review_photos WHERE review_id = ?").bind(reviewId).run();

  // Insert new photos (up to MAX_PHOTOS)
  const urls = photoUrls.slice(0, MAX_PHOTOS);
  if (urls.length === 0) return;

  const stmts = urls.map((url, i) =>
    db
      .prepare("INSERT INTO review_photos (review_id, photo_url, sort_order) VALUES (?, ?, ?)")
      .bind(reviewId, url, i)
  );

  await db.batch(stmts);
}

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
    photo_urls?: string[];
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

  // Use first photo_url from array, or fall back to single photo_url
  const photoUrls = body.photo_urls ?? (body.photo_url ? [body.photo_url] : []);
  const primaryPhoto = photoUrls[0]?.trim() || null;

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
      primaryPhoto,
      body.visited_at || null
    )
    .first();

  // Save multi-photo records
  if (review && photoUrls.length > 0) {
    const validUrls = photoUrls.map((u) => u.trim()).filter(Boolean);
    await saveReviewPhotos(db, review.id as string, validUrls);
  }

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
    photo_urls?: string[];
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

  // Use first photo_url from array, or fall back to single photo_url
  const photoUrls = body.photo_urls ?? (body.photo_url != null ? [body.photo_url] : []);
  const primaryPhoto = photoUrls[0]?.trim() || null;

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
      primaryPhoto,
      body.visited_at || null,
      id,
      payload.member_id
    )
    .first();

  // Update multi-photo records
  if (review) {
    const validUrls = photoUrls.map((u) => u.trim()).filter(Boolean);
    await saveReviewPhotos(db, id, validUrls);
  }

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
