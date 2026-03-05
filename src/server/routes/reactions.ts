import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const VALID_EMOJIS = ["fire", "heart", "laughing", "100", "thumbsup"] as const;

const reactions = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string } };
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

  // Verify review exists and belongs to same family
  const review = await db
    .prepare(
      `SELECT rv.id FROM reviews rv
       JOIN restaurants r ON r.id = rv.restaurant_id
       WHERE rv.id = ? AND r.family_id = ?`
    )
    .bind(reviewId, payload.family_id)
    .first();

  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  // Check existing reaction
  const existing = await db
    .prepare("SELECT id, emoji FROM reactions WHERE review_id = ? AND member_id = ?")
    .bind(reviewId, payload.member_id)
    .first<{ id: string; emoji: string }>();

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
