import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie } from "hono/cookie";
import * as arctic from "arctic";
import type { Env, Member, Group, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { getProvider, isValidProvider } from "../utils/oauth-providers";
import { visiblePeersCte } from "../utils/visible-peers";

const auth = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

async function signSessionToken(memberId: string, name: string, secret: string): Promise<string> {
  return sign(
    {
      member_id: memberId,
      name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    },
    secret
  );
}

// Join/register — invite_code is optional (solo signup if omitted)
auth.post("/join", async (c) => {
  const body = await c.req.json<{ invite_code?: string; registration_token: string }>();

  if (!body.registration_token) {
    return c.json({ error: "A registration token is required" }, 400);
  }

  let regPayload: { oauth_provider: string; oauth_id: string; email: string; name: string };
  try {
    regPayload = (await verify(body.registration_token, c.env.JWT_SECRET, "HS256")) as typeof regPayload;
  } catch {
    return c.json({ error: "Invalid or expired registration token" }, 401);
  }

  const name = regPayload.name;
  const db = c.env.DB;
  const { oauth_provider, oauth_id, email } = regPayload;

  // Check if this OAuth identity is already linked to a member
  const existing = await db
    .prepare("SELECT id, name FROM members WHERE oauth_provider = ? AND oauth_id = ?")
    .bind(oauth_provider, oauth_id)
    .first<Member>();

  if (existing) {
    // Already registered — if invite_code provided, join that group
    if (body.invite_code?.trim()) {
      const group = await db
        .prepare("SELECT * FROM groups WHERE invite_code = ?")
        .bind(body.invite_code.trim())
        .first<Group>();

      if (!group) {
        return c.json({ error: "Invalid invite code" }, 404);
      }

      const alreadyInGroup = await db
        .prepare("SELECT id FROM group_members WHERE group_id = ? AND member_id = ?")
        .bind(group.id, existing.id)
        .first();

      if (!alreadyInGroup) {
        await db
          .prepare("INSERT INTO group_members (group_id, member_id, is_admin) VALUES (?, ?, 0)")
          .bind(group.id, existing.id)
          .run();
      }
    }

    const token = await signSessionToken(existing.id, existing.name, c.env.JWT_SECRET);
    return c.json({
      data: {
        token,
        member: { id: existing.id, name: existing.name },
      },
    });
  }

  // New user — create member (family_id uses a placeholder for legacy column)
  const placeholderFamilyId = "solo_" + crypto.randomUUID().slice(0, 8);

  const member = await db
    .prepare(
      `INSERT INTO members (family_id, name, is_admin, oauth_provider, oauth_id, email)
       VALUES (?, ?, 0, ?, ?, ?)
       RETURNING *`
    )
    .bind(placeholderFamilyId, name, oauth_provider, oauth_id, email ?? null)
    .first<Member>();

  if (!member) {
    return c.json({ error: "Failed to create member" }, 500);
  }

  // If invite_code provided, join that group
  if (body.invite_code?.trim()) {
    const group = await db
      .prepare("SELECT * FROM groups WHERE invite_code = ?")
      .bind(body.invite_code.trim())
      .first<Group>();

    if (group) {
      await db
        .prepare("INSERT INTO group_members (group_id, member_id, is_admin) VALUES (?, ?, 0)")
        .bind(group.id, member.id)
        .run();
    } else {
      return c.json({ error: "Invalid invite code" }, 404);
    }
  }

  const token = await signSessionToken(member.id, member.name, c.env.JWT_SECRET);
  return c.json({
    data: {
      token,
      member: { id: member.id, name: member.name },
    },
  });
});

// Get current user info + groups
auth.get("/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const [memberResult, groupsResult] = await db.batch([
    db.prepare("SELECT id, name, email FROM members WHERE id = ?").bind(payload.member_id),
    db.prepare(
      `SELECT g.id, g.name, gm.is_admin,
              (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.member_id = ?
       ORDER BY gm.joined_at ASC`
    ).bind(payload.member_id),
  ]);

  const member = memberResult?.results[0] as { id: string; name: string; email: string | null } | undefined;
  if (!member) {
    return c.json({ error: "Member not found" }, 404);
  }

  const memberGroups = (groupsResult?.results ?? []) as Array<{
    id: string; name: string; is_admin: number; member_count: number;
  }>;

  return c.json({
    data: {
      id: member.id,
      name: member.name,
      email: member.email,
      groups: memberGroups.map((g) => ({
        id: g.id,
        name: g.name,
        is_admin: g.is_admin === 1,
        member_count: g.member_count,
      })),
    },
  });
});

// Update display name
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
    .prepare("UPDATE members SET name = ? WHERE id = ? RETURNING id, name")
    .bind(name, payload.member_id)
    .first<{ id: string; name: string }>();

  if (!updated) {
    return c.json({ error: "Member not found" }, 404);
  }

  return c.json({ data: { id: updated.id, name: updated.name } });
});

// List visible peers (anyone sharing a group with the current user)
auth.get("/members", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `${visiblePeersCte()}
       SELECT DISTINCT m.id, m.name
       FROM members m
       WHERE m.id IN (SELECT member_id FROM visible_peers)`
    )
    .bind(payload.member_id, payload.member_id)
    .all<{ id: string; name: string }>();

  return c.json({ data: results });
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
    .prepare("SELECT id, name, email FROM members WHERE oauth_provider = ? AND oauth_id = ?")
    .bind(providerName, profile.id)
    .first<Member>();

  if (member) {
    const token = await signSessionToken(member.id, member.name, c.env.JWT_SECRET);
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
