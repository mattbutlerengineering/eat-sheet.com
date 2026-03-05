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

  const [totalsResult, membersResult, cuisinesResult, categoryResult] = await db.batch([
    db.prepare(
      `SELECT
        (SELECT COUNT(*) FROM restaurants WHERE family_id = ?) as total_restaurants,
        (SELECT COUNT(*) FROM reviews rv JOIN restaurants r ON r.id = rv.restaurant_id WHERE r.family_id = ?) as total_reviews`
    ).bind(familyId, familyId),
    db.prepare(
      `SELECT m.name,
              COUNT(rv.id) as review_count,
              ROUND(AVG(rv.overall_score), 1) as avg_score
       FROM members m
       LEFT JOIN reviews rv ON rv.member_id = m.id
       WHERE m.family_id = ?
       GROUP BY m.id
       ORDER BY review_count DESC`
    ).bind(familyId),
    db.prepare(
      `SELECT cuisine, COUNT(*) as count
       FROM restaurants
       WHERE family_id = ? AND cuisine IS NOT NULL AND cuisine != ''
       GROUP BY cuisine
       ORDER BY count DESC`
    ).bind(familyId),
    db.prepare(
      `SELECT
        ROUND(AVG(rv.food_score), 1) as food,
        ROUND(AVG(rv.service_score), 1) as service,
        ROUND(AVG(rv.ambiance_score), 1) as ambiance,
        ROUND(AVG(rv.value_score), 1) as value
       FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE r.family_id = ?`
    ).bind(familyId),
  ]);

  const totals = totalsResult?.results[0] as { total_restaurants: number; total_reviews: number } | undefined;
  const categoryAvgs = categoryResult?.results[0] as { food: number | null; service: number | null; ambiance: number | null; value: number | null } | undefined;

  return c.json({
    data: {
      total_restaurants: totals?.total_restaurants ?? 0,
      total_reviews: totals?.total_reviews ?? 0,
      members: membersResult?.results ?? [],
      cuisine_breakdown: cuisinesResult?.results ?? [],
      category_averages: categoryAvgs ?? { food: null, service: null, ambiance: null, value: null },
    },
  });
});

export { stats as statsRoutes };
