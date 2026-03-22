import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";

const activity = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

activity.use("*", authMiddleware);

activity.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const cursor = c.req.query("cursor");
  const rawLimit = Number(c.req.query("limit") ?? 30);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 30, 1), 100);

  const cursorClause = cursor ? "WHERE timestamp < ?" : "";
  const binds: (string | number)[] = [payload.member_id, payload.member_id];
  if (cursor) {
    binds.push(cursor);
  }
  binds.push(limit);

  const { results } = await db
    .prepare(
      `${visiblePeersCte()}
       SELECT * FROM (
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
        WHERE r.created_by IN (SELECT member_id FROM visible_peers)

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
        WHERE rest.created_by IN (SELECT member_id FROM visible_peers)
          AND rv.member_id IN (SELECT member_id FROM visible_peers)
      )
      ${cursorClause}
      ORDER BY timestamp DESC
      LIMIT ?`
    )
    .bind(...binds)
    .all();

  const lastItem = results[results.length - 1] as { timestamp: string } | undefined;
  const next_cursor = lastItem?.timestamp ?? null;

  return c.json({ data: results, next_cursor });
});

export { activity as activityRoutes };
