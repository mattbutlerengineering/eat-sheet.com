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
              COUNT(rv.id) as review_count
       FROM restaurants r
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
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
              COUNT(rv.id) as review_count
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

  return c.json({ data: { ...restaurant, reviews } });
});

restaurants.post("/", async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{
    name: string;
    cuisine?: string;
    address?: string;
    photo_url?: string;
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Restaurant name is required" }, 400);
  }

  const db = c.env.DB;
  const restaurant = await db
    .prepare(
      `INSERT INTO restaurants (family_id, name, cuisine, address, photo_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      payload.family_id,
      body.name.trim(),
      body.cuisine?.trim() || null,
      body.address?.trim() || null,
      body.photo_url?.trim() || null,
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
       SET name = ?, cuisine = ?, address = ?, photo_url = ?
       WHERE id = ? AND family_id = ?
       RETURNING *`
    )
    .bind(
      body.name.trim(),
      body.cuisine?.trim() || null,
      body.address?.trim() || null,
      body.photo_url?.trim() || null,
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
