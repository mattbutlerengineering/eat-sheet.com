import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";
import { rateLimit } from "../middleware/rate-limit";

const exportRoute = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

const exportLimit = rateLimit({ max: 5, windowMs: 60_000 });

exportRoute.get("/", exportLimit, authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;
  const mid = payload.member_id;

  const [restaurantsResult, reviewsResult, bookmarksResult] = await db.batch([
    db.prepare(
      `${visiblePeersCte()}
       SELECT r.id, r.name, r.cuisine, r.address, r.latitude, r.longitude,
              r.google_place_id, r.created_at, m.name as creator_name
       FROM restaurants r
       JOIN members m ON m.id = r.created_by
       WHERE r.created_by IN (SELECT member_id FROM visible_peers)
       ORDER BY r.created_at DESC`
    ).bind(mid, mid),
    db.prepare(
      `SELECT rv.id, rv.restaurant_id, rv.overall_score, rv.food_score,
              rv.service_score, rv.ambiance_score, rv.value_score,
              rv.notes, rv.visited_at, rv.created_at, rv.updated_at,
              rest.name as restaurant_name
       FROM reviews rv
       JOIN restaurants rest ON rest.id = rv.restaurant_id
       WHERE rv.member_id = ?
       ORDER BY rv.created_at DESC`
    ).bind(mid),
    db.prepare(
      `SELECT b.restaurant_id, r.name as restaurant_name, b.created_at
       FROM bookmarks b
       JOIN restaurants r ON r.id = b.restaurant_id
       WHERE b.member_id = ?
       ORDER BY b.created_at DESC`
    ).bind(mid),
  ]);

  const format = c.req.query("format");

  const data = {
    exported_at: new Date().toISOString(),
    member: { id: mid, name: payload.name },
    restaurants: restaurantsResult?.results ?? [],
    my_reviews: reviewsResult?.results ?? [],
    my_bookmarks: bookmarksResult?.results ?? [],
  };

  if (format === "csv") {
    const reviews = (reviewsResult?.results ?? []) as Array<Record<string, unknown>>;
    const header = "restaurant_name,overall_score,food_score,service_score,ambiance_score,value_score,notes,visited_at,created_at";
    const rows = reviews.map((r) =>
      [r.restaurant_name, r.overall_score, r.food_score ?? "", r.service_score ?? "",
       r.ambiance_score ?? "", r.value_score ?? "",
       `"${String(r.notes ?? "").replace(/"/g, '""')}"`,
       r.visited_at ?? "", r.created_at].join(",")
    );
    const csv = [header, ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="eat-sheet-reviews-${mid}.csv"`,
      },
    });
  }

  return c.json({ data });
});

export { exportRoute as exportRoutes };
