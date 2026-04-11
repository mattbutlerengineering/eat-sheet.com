import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Google } from 'arctic';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';

type HonoEnv = { Bindings: Env; Variables: AppVariables };

const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

const switchTenantSchema = z.object({
  tenant_id: z.string().min(1),
});

function makeJwtPayload(
  userId: string,
  tenantId: string | null,
  roleId: string | null,
  permissions: string[]
) {
  return {
    userId,
    tenantId: tenantId ?? '',
    roleId: roleId ?? '',
    permissions,
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
  };
}

export const authRoutes = new Hono<HonoEnv>();

// Generate a random code verifier for PKCE
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// POST /google — Initiate Google OAuth (PKCE flow)
authRoutes.post('/google', async (c) => {
  const google = new Google(
    c.env.GOOGLE_OAUTH_CLIENT_ID,
    c.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${c.env.OAUTH_REDIRECT_BASE}/api/auth/google/callback`
  );

  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);

  // Return codeVerifier to the client so it can pass it back via the state cookie/storage
  return c.json({ success: true, data: { url: url.toString(), state, codeVerifier } }, 200);
});

// GET /google/callback — Google redirects here, we forward to client-side callback page
authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) {
    return c.json({ success: false, error: 'Missing code or state parameter' }, 400);
  }
  const params = new URLSearchParams({ code, state });
  return c.redirect(`/auth/callback?${params.toString()}`);
});

// POST /google/callback — Token exchange (client sends code + code_verifier from sessionStorage)
authRoutes.post('/google/callback', async (c) => {
  const body = await c.req.json().catch(() => null) as { code?: string; state?: string; code_verifier?: string } | null;
  const code = body?.code;
  const state = body?.state;
  const codeVerifier = body?.code_verifier;

  if (!code || !state || !codeVerifier) {
    return c.json({ success: false, error: 'Missing code, state, or code_verifier parameter' }, 400);
  }

  const google = new Google(
    c.env.GOOGLE_OAUTH_CLIENT_ID,
    c.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${c.env.OAUTH_REDIRECT_BASE}/api/auth/google/callback`
  );

  let tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    return c.json({ success: false, error: 'Invalid authorization code' }, 400);
  }

  // Fetch Google user info
  const accessToken = tokens.accessToken();
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoRes.ok) {
    return c.json({ success: false, error: 'Failed to fetch user info from Google' }, 502);
  }

  const googleUser = (await userInfoRes.json()) as {
    id: string;
    email: string;
    name: string;
  };

  const db = c.env.DB;

  // Find or create user
  let user = await db
    .prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?')
    .bind('google', googleUser.id)
    .first<{ id: string; email: string; name: string }>();

  if (user === null) {
    const userId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();
    await db
      .prepare(
        'INSERT INTO users (id, email, name, oauth_provider, oauth_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(userId, googleUser.email, googleUser.name, 'google', googleUser.id, now)
      .run();

    user = { id: userId, email: googleUser.email, name: googleUser.name };
  }

  // Get first tenant membership
  const membership = await db
    .prepare(
      `SELECT tm.tenant_id, tm.role_id
       FROM tenant_members tm
       WHERE tm.user_id = ?
       ORDER BY tm.created_at ASC
       LIMIT 1`
    )
    .bind(user.id)
    .first<{ tenant_id: string; role_id: string }>();

  // Get permissions for role if membership exists
  let permissions: string[] = [];
  if (membership !== null) {
    const permRows = await db
      .prepare(
        `SELECT p.key FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ?`
      )
      .bind(membership.role_id)
      .all<{ key: string }>();
    permissions = permRows.results.map((r) => r.key);
  }

  const payload = makeJwtPayload(
    user.id,
    membership?.tenant_id ?? null,
    membership?.role_id ?? null,
    permissions
  );

  const token = await sign(payload, c.env.JWT_SECRET);
  return c.json({ success: true, data: { token } }, 200);
});

// POST /refresh — Re-sign JWT with fresh expiry (requires auth middleware upstream)
authRoutes.post('/refresh', async (c) => {
  const userId = c.get('userId');
  const tenantId = c.get('tenantId');
  const roleId = c.get('roleId');
  const permissions = c.get('permissions');

  const payload = makeJwtPayload(userId, tenantId, roleId, permissions);
  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({ success: true, data: { token } }, 200);
});

// GET /me — Return current user profile and tenant memberships (requires auth middleware upstream)
authRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;

  const user = await db
    .prepare('SELECT id, email, name FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; email: string; name: string }>();

  if (user === null) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  const membershipsResult = await db
    .prepare(
      `SELECT tm.tenant_id, t.name AS tenant_name, t.slug AS tenant_slug,
              tm.role_id, r.name AS role_name, tm.is_owner
       FROM tenant_members tm
       JOIN tenants t ON t.id = tm.tenant_id
       JOIN roles r ON r.id = tm.role_id
       WHERE tm.user_id = ?
       ORDER BY tm.created_at ASC`
    )
    .bind(userId)
    .all<{
      tenant_id: string;
      tenant_name: string;
      tenant_slug: string;
      role_id: string;
      role_name: string;
      is_owner: number;
    }>();

  return c.json(
    {
      success: true,
      data: {
        user,
        memberships: membershipsResult.results,
      },
    },
    200
  );
});

// POST /switch-tenant — Switch active tenant context (requires auth middleware upstream)
authRoutes.post('/switch-tenant', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = switchTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const { tenant_id } = parsed.data;
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  const db = c.env.DB;

  // Verify user is a member of the target tenant
  const membership = await db
    .prepare('SELECT * FROM tenant_members WHERE user_id = ? AND tenant_id = ?')
    .bind(userId, tenant_id)
    .first<{ id: string; role_id: string; tenant_id: string }>();

  if (membership === null) {
    return c.json({ success: false, error: 'Not a member of this tenant' }, 403);
  }

  // Load role permissions
  const permRows = await db
    .prepare(
      `SELECT p.key FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?`
    )
    .bind(membership.role_id)
    .all<{ key: string }>();

  const permissions = permRows.results.map((r) => r.key);

  const payload = makeJwtPayload(userId, tenant_id, membership.role_id, permissions);
  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({ success: true, data: { token } }, 200);
});
