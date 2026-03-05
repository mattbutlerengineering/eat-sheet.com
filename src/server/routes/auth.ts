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

  const family = await db
    .prepare("SELECT name FROM families WHERE id = ?")
    .bind(member.family_id)
    .first<{ name: string }>();

  return c.json({
    data: {
      id: member.id,
      family_id: member.family_id,
      name: member.name,
      is_admin: member.is_admin === 1,
      family_name: family?.name ?? null,
    },
  });
});

auth.put("/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ name?: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Name is required" }, 400);
  }

  const name = body.name.trim();
  if (name.length > 50) {
    return c.json({ error: "Name must be 50 characters or less" }, 400);
  }

  const db = c.env.DB;
  const updated = await db
    .prepare("UPDATE members SET name = ? WHERE id = ? RETURNING id, family_id, name, is_admin")
    .bind(name, payload.member_id)
    .first<Member>();

  if (!updated) {
    return c.json({ error: "Member not found" }, 404);
  }

  return c.json({
    data: {
      id: updated.id,
      family_id: updated.family_id,
      name: updated.name,
      is_admin: updated.is_admin === 1,
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

auth.get("/invite-code", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const db = c.env.DB;
  const family = await db
    .prepare("SELECT invite_code FROM families WHERE id = ?")
    .bind(payload.family_id)
    .first<{ invite_code: string }>();

  if (!family) {
    return c.json({ error: "Family not found" }, 404);
  }

  return c.json({ data: { invite_code: family.invite_code } });
});

auth.post("/regenerate-code", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const db = c.env.DB;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  const family = await db
    .prepare("UPDATE families SET invite_code = ? WHERE id = ? RETURNING invite_code")
    .bind(code, payload.family_id)
    .first<{ invite_code: string }>();

  if (!family) {
    return c.json({ error: "Family not found" }, 404);
  }

  return c.json({ data: { invite_code: family.invite_code } });
});

auth.delete("/members/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const memberId = c.req.param("id");
  if (memberId === payload.member_id) {
    return c.json({ error: "Cannot remove yourself" }, 400);
  }

  const db = c.env.DB;
  const member = await db
    .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, payload.family_id)
    .first<{ id: string }>();

  if (!member) {
    return c.json({ error: "Member not found" }, 404);
  }

  await db
    .prepare("DELETE FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, payload.family_id)
    .run();

  return c.json({ data: { success: true } });
});

export { auth as authRoutes };
