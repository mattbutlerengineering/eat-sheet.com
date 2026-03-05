import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const bookmarks = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

bookmarks.use("*", authMiddleware);

// Toggle bookmark for a restaurant
bookmarks.post("/:restaurantId", async (c) => {
  const payload = c.get("jwtPayload");
  const restaurantId = c.req.param("restaurantId");
  const db = c.env.DB;

  // Verify restaurant belongs to family
  const restaurant = await db
    .prepare("SELECT id FROM restaurants WHERE id = ? AND family_id = ?")
    .bind(restaurantId, payload.family_id)
    .first();

  if (!restaurant) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  // Check if already bookmarked
  const existing = await db
    .prepare("SELECT id FROM bookmarks WHERE member_id = ? AND restaurant_id = ?")
    .bind(payload.member_id, restaurantId)
    .first();

  if (existing) {
    // Remove bookmark
    await db
      .prepare("DELETE FROM bookmarks WHERE id = ?")
      .bind(existing.id)
      .run();
    return c.json({ data: { bookmarked: false } });
  }

  // Add bookmark
  await db
    .prepare("INSERT INTO bookmarks (member_id, restaurant_id) VALUES (?, ?)")
    .bind(payload.member_id, restaurantId)
    .run();

  return c.json({ data: { bookmarked: true } }, 201);
});

// List bookmarked restaurants for current member
bookmarks.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT r.*,
              ROUND(AVG(rv.overall_score), 1) as avg_score,
              COUNT(rv.id) as review_count,
              m.name as creator_name,
              b.created_at as bookmarked_at
       FROM bookmarks b
       JOIN restaurants r ON r.id = b.restaurant_id
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       LEFT JOIN members m ON m.id = r.created_by
       WHERE b.member_id = ? AND r.family_id = ?
       GROUP BY r.id
       ORDER BY b.created_at DESC`
    )
    .bind(payload.member_id, payload.family_id)
    .all();

  return c.json({ data: results });
});

export { bookmarks as bookmarkRoutes };
