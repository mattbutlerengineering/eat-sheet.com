import { Hono } from "hono";
import type { Env, JwtPayload, Group } from "../types";
import { authMiddleware } from "../middleware/auth";

const groups = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

groups.use("*", authMiddleware);

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// Create a new group
groups.post("/", async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ name: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Group name is required" }, 400);
  }

  const name = body.name.trim();
  if (name.length > 50) {
    return c.json({ error: "Group name must be 50 characters or less" }, 400);
  }

  const db = c.env.DB;
  const code = generateInviteCode();

  try {
    const group = await db
      .prepare(
        `INSERT INTO groups (name, invite_code, created_by)
         VALUES (?, ?, ?)
         RETURNING *`
      )
      .bind(name, code, payload.member_id)
      .first<Group>();

    if (!group) {
      return c.json({ error: "Failed to create group" }, 500);
    }

    // Creator is automatically admin
    await db
      .prepare("INSERT INTO group_members (group_id, member_id, is_admin) VALUES (?, ?, 1)")
      .bind(group.id, payload.member_id)
      .run();

    return c.json({ data: { ...group, is_admin: true, member_count: 1 } }, 201);
  } catch (err) {
    console.error("Group creation failed:", err);
    return c.json({ error: "Failed to create group" }, 500);
  }
});

// List user's groups
groups.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT g.id, g.name, gm.is_admin,
              (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.member_id = ?
       ORDER BY gm.joined_at ASC`
    )
    .bind(payload.member_id)
    .all<{ id: string; name: string; is_admin: number; member_count: number }>();

  return c.json({
    data: results.map((g) => ({ ...g, is_admin: g.is_admin === 1 })),
  });
});

// Repair orphaned group_members (missing groups row)
groups.post("/repair", async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results: orphans } = await db
    .prepare(
      `SELECT DISTINCT gm.group_id
       FROM group_members gm
       LEFT JOIN groups g ON g.id = gm.group_id
       WHERE gm.member_id = ? AND g.id IS NULL`
    )
    .bind(payload.member_id)
    .all<{ group_id: string }>();

  let repaired = 0;
  for (const orphan of orphans) {
    // Try to get original name from families table
    const family = await db
      .prepare("SELECT name FROM families WHERE id = ?")
      .bind(orphan.group_id)
      .first<{ name: string }>();

    const name = family?.name ?? `${payload.name}'s Group`;
    const code = generateInviteCode();

    await db
      .prepare(
        `INSERT INTO groups (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)`
      )
      .bind(orphan.group_id, name, code, payload.member_id)
      .run();

    // Ensure caller is admin of the repaired group
    await db
      .prepare("UPDATE group_members SET is_admin = 1 WHERE group_id = ? AND member_id = ?")
      .bind(orphan.group_id, payload.member_id)
      .run();

    repaired++;
  }

  return c.json({ data: { repaired } });
});

// Join a group by invite code
groups.post("/join", async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ invite_code: string }>();

  if (!body.invite_code?.trim()) {
    return c.json({ error: "Invite code is required" }, 400);
  }

  const db = c.env.DB;
  const group = await db
    .prepare("SELECT * FROM groups WHERE invite_code = ?")
    .bind(body.invite_code.trim())
    .first<Group>();

  if (!group) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  // Check if already a member
  const existing = await db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(group.id, payload.member_id)
    .first();

  if (existing) {
    return c.json({ error: "You are already a member of this group" }, 409);
  }

  await db
    .prepare("INSERT INTO group_members (group_id, member_id, is_admin) VALUES (?, ?, 0)")
    .bind(group.id, payload.member_id)
    .run();

  return c.json({ data: { id: group.id, name: group.name, is_admin: false } });
});

// Leave a group
groups.delete("/:id/leave", async (c) => {
  const payload = c.get("jwtPayload");
  const groupId = c.req.param("id");
  const db = c.env.DB;

  const membership = await db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, payload.member_id)
    .first();

  if (!membership) {
    return c.json({ error: "You are not a member of this group" }, 404);
  }

  await db
    .prepare("DELETE FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, payload.member_id)
    .run();

  return c.json({ data: { success: true } });
});

// List group members
groups.get("/:id/members", async (c) => {
  const payload = c.get("jwtPayload");
  const groupId = c.req.param("id");
  const db = c.env.DB;

  // Verify caller is a member
  const membership = await db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, payload.member_id)
    .first();

  if (!membership) {
    return c.json({ error: "Not a member of this group" }, 403);
  }

  const { results } = await db
    .prepare(
      `SELECT m.id, m.name, gm.is_admin
       FROM group_members gm
       JOIN members m ON m.id = gm.member_id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC`
    )
    .bind(groupId)
    .all<{ id: string; name: string; is_admin: number }>();

  return c.json({
    data: results.map((m) => ({ ...m, is_admin: m.is_admin === 1 })),
  });
});

// Get invite code for a group (admin only)
groups.get("/:id/invite-code", async (c) => {
  const payload = c.get("jwtPayload");
  const groupId = c.req.param("id");
  const db = c.env.DB;

  const membership = await db
    .prepare("SELECT is_admin FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, payload.member_id)
    .first<{ is_admin: number }>();

  if (!membership) {
    return c.json({ error: "Not a member of this group" }, 403);
  }
  if (membership.is_admin !== 1) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const group = await db
    .prepare("SELECT invite_code FROM groups WHERE id = ?")
    .bind(groupId)
    .first<{ invite_code: string }>();

  if (!group) {
    return c.json({ error: "Group not found" }, 404);
  }

  return c.json({ data: { invite_code: group.invite_code } });
});

// Regenerate invite code (admin only)
groups.post("/:id/regenerate-code", async (c) => {
  const payload = c.get("jwtPayload");
  const groupId = c.req.param("id");
  const db = c.env.DB;

  const membership = await db
    .prepare("SELECT is_admin FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, payload.member_id)
    .first<{ is_admin: number }>();

  if (!membership) {
    return c.json({ error: "Not a member of this group" }, 403);
  }
  if (membership.is_admin !== 1) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const code = generateInviteCode();
  const group = await db
    .prepare("UPDATE groups SET invite_code = ? WHERE id = ? RETURNING invite_code")
    .bind(code, groupId)
    .first<{ invite_code: string }>();

  if (!group) {
    return c.json({ error: "Group not found" }, 404);
  }

  return c.json({ data: { invite_code: group.invite_code } });
});

// Remove a member from a group (admin only)
groups.delete("/:id/members/:memberId", async (c) => {
  const payload = c.get("jwtPayload");
  const groupId = c.req.param("id");
  const memberId = c.req.param("memberId");
  const db = c.env.DB;

  if (memberId === payload.member_id) {
    return c.json({ error: "Cannot remove yourself. Use leave instead." }, 400);
  }

  const membership = await db
    .prepare("SELECT is_admin FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, payload.member_id)
    .first<{ is_admin: number }>();

  if (!membership || membership.is_admin !== 1) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const target = await db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, memberId)
    .first();

  if (!target) {
    return c.json({ error: "Member not found in this group" }, 404);
  }

  await db
    .prepare("DELETE FROM group_members WHERE group_id = ? AND member_id = ?")
    .bind(groupId, memberId)
    .run();

  return c.json({ data: { success: true } });
});

export { groups as groupRoutes };
