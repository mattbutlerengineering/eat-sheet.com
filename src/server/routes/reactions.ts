import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { visiblePeersCte } from "../utils/visible-peers";

const VALID_EMOJIS = ["fire", "heart", "laughing", "100", "thumbsup"] as const;

const reactions = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

reactions.use("*", authMiddleware);

reactions.post("/:reviewId", async (c) => {
  const payload = c.get("jwtPayload");
  const reviewId = c.req.param("reviewId");
  const body = await c.req.json<{ emoji: string }>();
  const db = c.env.DB;

  if (!body.emoji || !VALID_EMOJIS.includes(body.emoji as typeof VALID_EMOJIS[number])) {
    return c.json({ error: "Invalid emoji. Must be one of: fire, heart, laughing, 100, thumbsup" }, 400);
  }

  // Batch: verify review is visible + check existing reaction
  const [reviewResult, existingResult] = await db.batch([
    db.prepare(
      `${visiblePeersCte()}
       SELECT rv.id FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE rv.id = ? AND r.created_by IN (SELECT member_id FROM visible_peers)`
    ).bind(payload.member_id, payload.member_id, reviewId),
    db.prepare("SELECT id, emoji FROM reactions WHERE review_id = ? AND member_id = ?")
      .bind(reviewId, payload.member_id),
  ]);

  const review = reviewResult?.results[0];
  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  const existing = existingResult?.results[0] as { id: string; emoji: string } | undefined;

  if (existing) {
    if (existing.emoji === body.emoji) {
      // Same emoji = remove (toggle off)
      await db.prepare("DELETE FROM reactions WHERE id = ?").bind(existing.id).run();
      return c.json({ data: { action: "removed" } });
    }
    // Different emoji = switch
    await db
      .prepare("UPDATE reactions SET emoji = ? WHERE id = ?")
      .bind(body.emoji, existing.id)
      .run();
    return c.json({ data: { action: "switched", emoji: body.emoji } });
  }

  // New reaction
  await db
    .prepare("INSERT INTO reactions (review_id, member_id, emoji) VALUES (?, ?, ?)")
    .bind(reviewId, payload.member_id, body.emoji)
    .run();

  return c.json({ data: { action: "added", emoji: body.emoji } }, 201);
});

export { reactions as reactionRoutes };
