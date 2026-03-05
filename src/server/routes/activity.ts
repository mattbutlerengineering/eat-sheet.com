import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const activity = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
}>();

activity.use("*", authMiddleware);

activity.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT * FROM (
        SELECT
          r.id,
          'restaurant_added' as type,
          m.name as member_name,
          r.id as restaurant_id,
          r.name as restaurant_name,
          NULL as score,
          r.created_at as timestamp
        FROM restaurants r
        JOIN members m ON m.id = r.created_by
        WHERE r.family_id = ?

        UNION ALL

        SELECT
          rv.id,
          CASE WHEN rv.updated_at > rv.created_at THEN 'review_updated' ELSE 'review_added' END as type,
          m.name as member_name,
          rv.restaurant_id,
          rest.name as restaurant_name,
          rv.overall_score as score,
          CASE WHEN rv.updated_at > rv.created_at THEN rv.updated_at ELSE rv.created_at END as timestamp
        FROM reviews rv
        JOIN members m ON m.id = rv.member_id
        JOIN restaurants rest ON rest.id = rv.restaurant_id
        WHERE rest.family_id = ?
      )
      ORDER BY timestamp DESC
      LIMIT 30`
    )
    .bind(payload.family_id, payload.family_id)
    .all();

  return c.json({ data: results });
});

export { activity as activityRoutes };
