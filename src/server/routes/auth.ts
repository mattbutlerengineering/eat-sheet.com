import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie } from "hono/cookie";
import * as arctic from "arctic";
import type { Env, Member, Family } from "../types";
import { authMiddleware } from "../middleware/auth";
import { getProvider, isValidProvider } from "../utils/oauth-providers";

const auth = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: { member_id: string; family_id: string; name: string; is_admin: boolean } };
}>();

auth.post("/join", async (c) => {
  const body = await c.req.json<{ invite_code: string; name: string; registration_token: string }>();

  if (!body.registration_token) {
    return c.json({ error: "A registration token is required" }, 400);
  }

  let regPayload: { oauth_provider: string; oauth_id: string; email: string; name: string };
  try {
    regPayload = (await verify(body.registration_token, c.env.JWT_SECRET, "HS256")) as typeof regPayload;
  } catch {
    return c.json({ error: "Invalid or expired registration token" }, 401);
  }

  if (!body.invite_code || !body.name?.trim()) {
    return c.json({ error: "Invite code and name are required" }, 400);
  }

  const name = body.name.trim();
  const db = c.env.DB;
  const { oauth_provider, oauth_id, email } = regPayload;

  const family = await db
    .prepare("SELECT * FROM families WHERE invite_code = ?")
    .bind(body.invite_code)
    .first<Family>();

  if (!family) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  // Check oauth identity isn't already linked to a different member
  const existing = await db
    .prepare("SELECT id, family_id, name FROM members WHERE oauth_provider = ? AND oauth_id = ?")
    .bind(oauth_provider, oauth_id)
    .first<Member>();

  if (existing) {
    if (existing.family_id !== family.id || existing.name !== name) {
      return c.json({ error: "This account is already linked to another member" }, 409);
    }
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

    member = await db
      .prepare("INSERT INTO members (family_id, name, is_admin, oauth_provider, oauth_id, email) VALUES (?, ?, ?, ?, ?, ?) RETURNING *")
      .bind(family.id, name, isFirst ? 1 : 0, oauth_provider, oauth_id, email ?? null)
      .first<Member>();
  } else if (!member.oauth_id) {
    // Link OAuth identity to existing member
    member = await db
      .prepare("UPDATE members SET oauth_provider = ?, oauth_id = ?, email = ? WHERE id = ? RETURNING *")
      .bind(oauth_provider, oauth_id, email ?? null, member.id)
      .first<Member>();
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
    .prepare(
      `SELECT m.id, m.family_id, m.name, m.is_admin, m.email, f.name as family_name
       FROM members m
       JOIN families f ON f.id = m.family_id
       WHERE m.id = ?`
    )
    .bind(payload.member_id)
    .first<Member & { family_name: string }>();

  if (!member) {
    return c.json({ error: "Member not found" }, 404);
  }

  return c.json({
    data: {
      id: member.id,
      family_id: member.family_id,
      name: member.name,
      is_admin: member.is_admin === 1,
      email: member.email,
      family_name: member.family_name,
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

// OAuth provider routes — MUST be after all specific routes to avoid /:provider matching "me", "members", etc.
auth.get("/:provider/callback", async (c) => {
  const providerName = c.req.param("provider");

  if (!isValidProvider(providerName)) {
    return c.json({ error: "Unknown auth provider" }, 404);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");
  const storedCodeVerifier = getCookie(c, "oauth_code_verifier");

  if (!code || !state || !storedState || state !== storedState || !storedCodeVerifier) {
    return c.json({ error: "Invalid OAuth callback" }, 400);
  }

  setCookie(c, "oauth_state", "", { maxAge: 0, path: "/" });
  setCookie(c, "oauth_code_verifier", "", { maxAge: 0, path: "/" });

  const provider = getProvider(providerName)!;
  const client = provider.createClient(c.env);

  let profile;
  try {
    const tokens = await client.validateAuthorizationCode(code, storedCodeVerifier);
    profile = provider.getProfile(tokens);
  } catch {
    return c.json({ error: "OAuth token exchange failed" }, 401);
  }

  const db = c.env.DB;
  const member = await db
    .prepare("SELECT id, family_id, name, is_admin, email FROM members WHERE oauth_provider = ? AND oauth_id = ?")
    .bind(providerName, profile.id)
    .first<Member>();

  if (member) {
    const token = await sign(
      {
        member_id: member.id,
        family_id: member.family_id,
        name: member.name,
        is_admin: member.is_admin === 1,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
      },
      c.env.JWT_SECRET
    );

    const base = c.env.OAUTH_REDIRECT_BASE;
    return c.redirect(`${base}/?token=${encodeURIComponent(token)}`);
  }

  const tempToken = await sign(
    {
      oauth_provider: providerName,
      oauth_id: profile.id,
      email: profile.email,
      name: profile.name,
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    c.env.JWT_SECRET
  );

  const base = c.env.OAUTH_REDIRECT_BASE;
  return c.redirect(`${base}/?register=true&token=${encodeURIComponent(tempToken)}`);
});

auth.get("/:provider", async (c) => {
  const providerName = c.req.param("provider");

  if (!isValidProvider(providerName)) {
    return c.json({ error: "Unknown auth provider" }, 404);
  }

  const provider = getProvider(providerName)!;
  const client = provider.createClient(c.env);

  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const url = client.createAuthorizationURL(state, codeVerifier, provider.scopes);

  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  return c.redirect(url.toString());
});

export { auth as authRoutes };
