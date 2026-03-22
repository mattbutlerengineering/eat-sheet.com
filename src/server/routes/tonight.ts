import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";

const tonight = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

tonight.use("*", authMiddleware);

const LIMIT = 10;
const MIN_SCORE = 5.0;

const RESTAURANT_COLS = "r.id, r.name, r.cuisine, r.address, r.photo_url";

interface SuggestionRow {
  readonly avg_score: number | null;
  readonly user_bookmarked: number;
  readonly review_count: number;
}

function computeReason(row: SuggestionRow): string {
  const parts: string[] = [];
  if (row.avg_score !== null && row.avg_score !== undefined) {
    parts.push(`Scored ${Number(row.avg_score).toFixed(1)} by your group`);
  }
  if (row.user_bookmarked) {
    parts.push("You bookmarked this");
  }
  if (row.review_count !== null && row.review_count !== undefined && Number(row.review_count) > 1) {
    parts.push(`${row.review_count} reviews`);
  }
  return parts.join(" · ") || "Worth a try";
}

function toSuggestions(result: { results?: readonly Record<string, unknown>[] }) {
  return (result.results ?? []).map((row) => ({
    ...row,
    reason: computeReason(row as unknown as SuggestionRow),
  }));
}

tonight.get("/", async (c) => {
  const mode = c.req.query("mode");
  if (mode !== "usual" && mode !== "new") {
    return c.json({ error: "mode must be 'usual' or 'new'" }, 400);
  }

  const payload = c.get("jwtPayload");
  const db = c.env.DB;
  const mid = payload.member_id;

  if (mode === "usual") {
    const result = await db
      .prepare(
        `${visiblePeersCte()}
         SELECT ${RESTAURANT_COLS}, ROUND(AVG(rv.overall_score), 1) as avg_score,
                COUNT(rv.id) as review_count,
                EXISTS(SELECT 1 FROM bookmarks b WHERE b.restaurant_id = r.id AND b.member_id = ?) as user_bookmarked
         FROM restaurants r
         JOIN reviews rv ON rv.restaurant_id = r.id
         WHERE r.created_by IN (SELECT member_id FROM visible_peers)
         GROUP BY r.id
         HAVING AVG(rv.overall_score) >= ?
         ORDER BY (AVG(rv.overall_score) * 0.4)
           + (CASE WHEN EXISTS(SELECT 1 FROM bookmarks b WHERE b.restaurant_id = r.id AND b.member_id = ?) THEN 2.0 ELSE 0 END)
           + (MIN(COUNT(rv.id), 5) * 0.2) DESC
         LIMIT ?`
      )
      .bind(mid, mid, mid, MIN_SCORE, mid, LIMIT)
      .all();

    c.header("Cache-Control", "private, max-age=300");
    return c.json({ data: toSuggestions(result) });
  }

  const result = await db
    .prepare(
      `${visiblePeersCte()}
       SELECT ${RESTAURANT_COLS}, ROUND(AVG(rv.overall_score), 1) as avg_score,
              COUNT(rv.id) as review_count,
              EXISTS(SELECT 1 FROM bookmarks b WHERE b.restaurant_id = r.id AND b.member_id = ?) as user_bookmarked
       FROM restaurants r
       LEFT JOIN reviews rv ON rv.restaurant_id = r.id
       LEFT JOIN reviews my_rv ON my_rv.restaurant_id = r.id AND my_rv.member_id = ?
       WHERE r.created_by IN (SELECT member_id FROM visible_peers) AND my_rv.id IS NULL
       GROUP BY r.id
       ORDER BY (COALESCE(AVG(rv.overall_score), 5) * 0.3)
         + (CASE WHEN EXISTS(SELECT 1 FROM bookmarks b WHERE b.restaurant_id = r.id AND b.member_id = ?) THEN 3.0 ELSE 0 END) DESC
       LIMIT ?`
    )
    .bind(mid, mid, mid, mid, mid, LIMIT)
    .all();

  c.header("Cache-Control", "private, max-age=300");
  return c.json({ data: toSuggestions(result) });
});

export { tonight as tonightRoutes };
