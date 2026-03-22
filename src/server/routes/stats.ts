import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";

const stats = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

stats.use("*", authMiddleware);

stats.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;
  const mid = payload.member_id;

  const [totalsResult, membersResult, cuisinesResult, categoryResult, distributionResult] = await db.batch([
    db.prepare(
      `${visiblePeersCte()}
       SELECT
        (SELECT COUNT(*) FROM restaurants WHERE created_by IN (SELECT member_id FROM visible_peers)) as total_restaurants,
        (SELECT COUNT(*) FROM reviews rv JOIN restaurants r ON r.id = rv.restaurant_id WHERE r.created_by IN (SELECT member_id FROM visible_peers)) as total_reviews`
    ).bind(mid, mid),
    db.prepare(
      `${visiblePeersCte()}
       SELECT m.name,
              COUNT(rv.id) as review_count,
              ROUND(AVG(rv.overall_score), 1) as avg_score
       FROM members m
       LEFT JOIN reviews rv ON rv.member_id = m.id
       WHERE m.id IN (SELECT member_id FROM visible_peers)
       GROUP BY m.id
       ORDER BY review_count DESC`
    ).bind(mid, mid),
    db.prepare(
      `${visiblePeersCte()}
       SELECT cuisine, COUNT(*) as count
       FROM restaurants
       WHERE created_by IN (SELECT member_id FROM visible_peers) AND cuisine IS NOT NULL AND cuisine != ''
       GROUP BY cuisine
       ORDER BY count DESC`
    ).bind(mid, mid),
    db.prepare(
      `${visiblePeersCte()}
       SELECT
        ROUND(AVG(rv.food_score), 1) as food,
        ROUND(AVG(rv.service_score), 1) as service,
        ROUND(AVG(rv.ambiance_score), 1) as ambiance,
        ROUND(AVG(rv.value_score), 1) as value
       FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE r.created_by IN (SELECT member_id FROM visible_peers)`
    ).bind(mid, mid),
    db.prepare(
      `${visiblePeersCte()}
       SELECT rv.overall_score as score, COUNT(*) as count
       FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE r.created_by IN (SELECT member_id FROM visible_peers)
       GROUP BY rv.overall_score
       ORDER BY rv.overall_score ASC`
    ).bind(mid, mid),
  ]);

  const totals = totalsResult?.results[0] as { total_restaurants: number; total_reviews: number } | undefined;
  const categoryAvgs = categoryResult?.results[0] as { food: number | null; service: number | null; ambiance: number | null; value: number | null } | undefined;

  c.header("Cache-Control", "private, max-age=60");
  return c.json({
    data: {
      total_restaurants: totals?.total_restaurants ?? 0,
      total_reviews: totals?.total_reviews ?? 0,
      members: membersResult?.results ?? [],
      cuisine_breakdown: cuisinesResult?.results ?? [],
      category_averages: categoryAvgs ?? { food: null, service: null, ambiance: null, value: null },
      score_distribution: distributionResult?.results ?? [],
    },
  });
});

export { stats as statsRoutes };
