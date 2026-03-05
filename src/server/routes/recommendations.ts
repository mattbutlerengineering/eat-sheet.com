import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const recommendations = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

recommendations.use("*", authMiddleware);

const MAX_PER_CATEGORY = 3;

recommendations.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  // Fire all 4 recommendation queries in a single batch round-trip
  const [bookmarkedResult, revisitResult, needsOpinionsResult, newCuisinesResult] = await db.batch([
    // 1. Bookmarked restaurants the member hasn't reviewed yet
    db.prepare(
      `SELECT r.*, ROUND(AVG(rv.overall_score), 1) as avg_score, COUNT(rv.id) as review_count
       FROM bookmarks b
       JOIN restaurants r ON r.id = b.restaurant_id
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       LEFT JOIN reviews my_rv ON my_rv.restaurant_id = r.id AND my_rv.member_id = ?
       WHERE b.member_id = ? AND r.family_id = ? AND my_rv.id IS NULL
       GROUP BY r.id
       ORDER BY b.created_at DESC
       LIMIT ?`
    ).bind(payload.member_id, payload.member_id, payload.family_id, MAX_PER_CATEGORY),

    // 2. Restaurants rated 7+ by this member, last visited 60+ days ago
    db.prepare(
      `SELECT r.*, ROUND(AVG(all_rv.overall_score), 1) as avg_score, COUNT(all_rv.id) as review_count
       FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       LEFT JOIN reviews all_rv ON all_rv.restaurant_id = r.id
       WHERE rv.member_id = ? AND r.family_id = ? AND rv.overall_score >= 7
         AND rv.visited_at <= date('now', '-60 days')
       GROUP BY r.id
       ORDER BY rv.overall_score DESC
       LIMIT ?`
    ).bind(payload.member_id, payload.family_id, MAX_PER_CATEGORY),

    // 3. Family restaurants with exactly 1 review (needs second opinion)
    db.prepare(
      `SELECT r.*, ROUND(AVG(rv.overall_score), 1) as avg_score, COUNT(rv.id) as review_count
       FROM restaurants r
       JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE r.family_id = ?
       GROUP BY r.id
       HAVING COUNT(rv.id) = 1
       ORDER BY r.created_at DESC
       LIMIT ?`
    ).bind(payload.family_id, MAX_PER_CATEGORY),

    // 4. Cuisines the family has tried but this member hasn't reviewed
    db.prepare(
      `SELECT r.*, ROUND(AVG(rv.overall_score), 1) as avg_score, COUNT(rv.id) as review_count,
              r.cuisine as new_cuisine
       FROM restaurants r
       JOIN reviews rv ON rv.restaurant_id = r.id
       WHERE r.family_id = ? AND r.cuisine IS NOT NULL
         AND r.cuisine NOT IN (
           SELECT DISTINCT r2.cuisine FROM reviews rv2
           JOIN restaurants r2 ON r2.id = rv2.restaurant_id
           WHERE rv2.member_id = ? AND r2.cuisine IS NOT NULL
         )
       GROUP BY r.cuisine
       ORDER BY AVG(rv.overall_score) DESC
       LIMIT ?`
    ).bind(payload.family_id, payload.member_id, MAX_PER_CATEGORY),
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
