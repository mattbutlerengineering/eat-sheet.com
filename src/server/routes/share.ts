import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const share = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate share link for a restaurant (auth required)
share.post("/restaurant/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const db = c.env.DB;

  const restaurant = await db
    .prepare("SELECT id, share_token FROM restaurants WHERE id = ? AND family_id = ?")
    .bind(id, payload.family_id)
    .first<{ id: string; share_token: string | null }>();

  if (!restaurant) return c.json({ error: "Restaurant not found" }, 404);

  let token = restaurant.share_token;
  if (!token) {
    token = generateToken();
    await db.prepare("UPDATE restaurants SET share_token = ? WHERE id = ?").bind(token, id).run();
  }

  return c.json({ data: { share_token: token } });
});

// Generate share link for a review (auth required)
share.post("/review/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const db = c.env.DB;

  const review = await db
    .prepare(
      `SELECT rv.id, rv.share_token FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE rv.id = ? AND r.family_id = ?`
    )
    .bind(id, payload.family_id)
    .first<{ id: string; share_token: string | null }>();

  if (!review) return c.json({ error: "Review not found" }, 404);

  let token = review.share_token;
  if (!token) {
    token = generateToken();
    await db.prepare("UPDATE reviews SET share_token = ? WHERE id = ?").bind(token, id).run();
  }

  return c.json({ data: { share_token: token } });
});

// Public: Get shared restaurant (no auth)
share.get("/restaurant/:token", async (c) => {
  const token = c.req.param("token");
  const db = c.env.DB;

  const restaurant = await db
    .prepare(
      `SELECT r.name, r.cuisine, r.address, r.photo_url,
              ROUND(AVG(rv.overall_score), 1) as avg_score,
              COUNT(rv.id) as review_count
       FROM restaurants r
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE r.share_token = ?
       GROUP BY r.id`
    )
    .bind(token)
    .first();

  if (!restaurant) return c.json({ error: "Not found" }, 404);

  return c.json({ data: restaurant });
});

// Public: Get shared review (no auth)
share.get("/review/:token", async (c) => {
  const token = c.req.param("token");
  const db = c.env.DB;

  const review = await db
    .prepare(
      `SELECT rv.overall_score, rv.food_score, rv.service_score, rv.ambiance_score,
              rv.value_score, rv.notes, rv.photo_url, rv.visited_at,
              r.name as restaurant_name, r.cuisine as restaurant_cuisine
       FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE rv.share_token = ?`
    )
    .bind(token)
    .first();

  if (!review) return c.json({ error: "Not found" }, 404);

  return c.json({ data: review });
});

export { share as shareRoutes };
