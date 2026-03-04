import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { Env, Member, Family } from "../types";
import { authMiddleware } from "../middleware/auth";

const auth = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string; is_admin: boolean } };
}>();

auth.post("/join", async (c) => {
  const body = await c.req.json<{ invite_code: string; name: string }>();

  if (!body.invite_code || !body.name?.trim()) {
    return c.json({ error: "Invite code and name are required" }, 400);
  }

  const name = body.name.trim();
  const db = c.env.DB;

  const family = await db
    .prepare("SELECT * FROM families WHERE invite_code = ?")
    .bind(body.invite_code)
    .first<Family>();

  if (!family) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  let member = await db
    .prepare("SELECT * FROM members WHERE family_id = ? AND name = ?")
    .bind(family.id, name)
    .first<Member>();

  if (!member) {
    const memberCount = await db
      .prepare("SELECT COUNT(*) as count FROM members WHERE family_id = ?")
      .bind(family.id)
      .first<{ count: number }>();

    const isFirst = (memberCount?.count ?? 0) === 0;

    const result = await db
      .prepare("INSERT INTO members (family_id, name, is_admin) VALUES (?, ?, ?) RETURNING *")
      .bind(family.id, name, isFirst ? 1 : 0)
      .first<Member>();
    member = result;
  }

  if (!member) {
    return c.json({ error: "Failed to create member" }, 500);
  }

  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ error: "Server configuration error" }, 500);
  }
  const token = await sign(
    {
      member_id: member.id,
      family_id: member.family_id,
      name: member.name,
      is_admin: member.is_admin === 1,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    },
    secret
  );

  return c.json({
    data: {
      token,
      member: {
        id: member.id,
        family_id: member.family_id,
        name: member.name,
        is_admin: member.is_admin === 1,
      },
    },
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const member = await db
    .prepare("SELECT id, family_id, name, is_admin FROM members WHERE id = ?")
    .bind(payload.member_id)
    .first<Member>();

  if (!member) {
    return c.json({ error: "Member not found" }, 404);
  }

  return c.json({
    data: {
      id: member.id,
      family_id: member.family_id,
      name: member.name,
      is_admin: member.is_admin === 1,
    },
  });
});

auth.get("/members", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results } = await db
    .prepare("SELECT id, family_id, name FROM members WHERE family_id = ?")
    .bind(payload.family_id)
    .all<Member>();

  return c.json({ data: results });
});

export { auth as authRoutes };
