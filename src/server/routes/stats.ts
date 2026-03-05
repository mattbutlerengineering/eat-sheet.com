import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const stats = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

stats.use("*", authMiddleware);

stats.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;
  const familyId = payload.family_id;

  // Total restaurants
  const totalRestaurants = await db
    .prepare("SELECT COUNT(*) as count FROM restaurants WHERE family_id = ?")
    .bind(familyId)
    .first<{ count: number }>();

  // Total reviews
  const totalReviews = await db
    .prepare(
      `SELECT COUNT(*) as count FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE r.family_id = ?`
    )
    .bind(familyId)
    .first<{ count: number }>();

  // Member stats
  const { results: members } = await db
    .prepare(
      `SELECT m.name,
              COUNT(rv.id) as review_count,
              ROUND(AVG(rv.overall_score), 1) as avg_score
       FROM members m
       LEFT JOIN reviews rv ON rv.member_id = m.id
       WHERE m.family_id = ?
       GROUP BY m.id
       ORDER BY review_count DESC`
    )
    .bind(familyId)
    .all();

  // Cuisine breakdown
  const { results: cuisines } = await db
    .prepare(
      `SELECT cuisine, COUNT(*) as count
       FROM restaurants
       WHERE family_id = ? AND cuisine IS NOT NULL AND cuisine != ''
       GROUP BY cuisine
       ORDER BY count DESC`
    )
    .bind(familyId)
    .all();

  // Category averages
  const categoryAvgs = await db
    .prepare(
      `SELECT
        ROUND(AVG(rv.food_score), 1) as food,
        ROUND(AVG(rv.service_score), 1) as service,
        ROUND(AVG(rv.ambiance_score), 1) as ambiance,
        ROUND(AVG(rv.value_score), 1) as value
       FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE r.family_id = ?`
    )
    .bind(familyId)
    .first();

  return c.json({
    data: {
      total_restaurants: totalRestaurants?.count ?? 0,
      total_reviews: totalReviews?.count ?? 0,
      members,
      cuisine_breakdown: cuisines,
      category_averages: categoryAvgs ?? { food: null, service: null, ambiance: null, value: null },
    },
  });
});

export { stats as statsRoutes };
