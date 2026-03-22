import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";

const recommendations = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

recommendations.use("*", authMiddleware);

const MAX_PER_CATEGORY = 3;

recommendations.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;
  const mid = payload.member_id;

  // Fire all 4 recommendation queries in a single batch round-trip
  const [bookmarkedResult, revisitResult, needsOpinionsResult, newCuisinesResult] = await db.batch([
    // 1. Bookmarked restaurants the member hasn't reviewed yet
    db.prepare(
      `${visiblePeersCte()}
       SELECT r.*, ROUND(AVG(rv.overall_score), 1) as avg_score, COUNT(rv.id) as review_count
       FROM bookmarks b
       JOIN restaurants r ON r.id = b.restaurant_id
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       LEFT JOIN reviews my_rv ON my_rv.restaurant_id = r.id AND my_rv.member_id = ?
       WHERE b.member_id = ? AND r.created_by IN (SELECT member_id FROM visible_peers) AND my_rv.id IS NULL
       GROUP BY r.id
       ORDER BY b.created_at DESC
       LIMIT ?`
    ).bind(mid, mid, mid, mid, MAX_PER_CATEGORY),

    // 2. Restaurants rated 7+ by this member, last visited 60+ days ago
    db.prepare(
      `${visiblePeersCte()}
       SELECT r.*, ROUND(AVG(all_rv.overall_score), 1) as avg_score, COUNT(all_rv.id) as review_count
       FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       LEFT JOIN reviews all_rv ON all_rv.restaurant_id = r.id
       WHERE rv.member_id = ? AND r.created_by IN (SELECT member_id FROM visible_peers) AND rv.overall_score >= 7
         AND rv.visited_at <= date('now', '-60 days')
       GROUP BY r.id
       ORDER BY rv.overall_score DESC
       LIMIT ?`
    ).bind(mid, mid, mid, MAX_PER_CATEGORY),

    // 3. Restaurants with exactly 1 review (needs second opinion)
    db.prepare(
      `${visiblePeersCte()}
       SELECT r.*, ROUND(AVG(rv.overall_score), 1) as avg_score, COUNT(rv.id) as review_count
       FROM restaurants r
       JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE r.created_by IN (SELECT member_id FROM visible_peers)
       GROUP BY r.id
       HAVING COUNT(rv.id) = 1
       ORDER BY r.created_at DESC
       LIMIT ?`
    ).bind(mid, mid, MAX_PER_CATEGORY),

    // 4. Cuisines the group has tried but this member hasn't reviewed
    db.prepare(
      `${visiblePeersCte()},
       my_cuisines AS (
         SELECT DISTINCT r2.cuisine
         FROM reviews rv2
         JOIN restaurants r2 ON r2.id = rv2.restaurant_id
         WHERE rv2.member_id = ? AND r2.cuisine IS NOT NULL
       )
       SELECT r.*, ROUND(AVG(rv.overall_score), 1) as avg_score, COUNT(rv.id) as review_count,
              r.cuisine as new_cuisine
       FROM restaurants r
       JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE r.created_by IN (SELECT member_id FROM visible_peers) AND r.cuisine IS NOT NULL
         AND r.cuisine NOT IN (SELECT cuisine FROM my_cuisines)
       GROUP BY r.cuisine
       ORDER BY avg_score DESC
       LIMIT ?`
    ).bind(mid, mid, mid, MAX_PER_CATEGORY),
  ]);

  const bookmarked = bookmarkedResult?.results ?? [];
  const revisit = revisitResult?.results ?? [];
  const needs_opinions = needsOpinionsResult?.results ?? [];

  const newCuisineRows = (newCuisinesResult?.results ?? []) as Array<Record<string, unknown>>;
  const new_cuisines = newCuisineRows.map((row) => ({
    cuisine: row.new_cuisine as string,
    restaurant: { ...row, new_cuisine: undefined },
  }));

  return c.json({
    data: { bookmarked, revisit, needs_opinions, new_cuisines },
  });
});

export { recommendations as recommendationRoutes };
