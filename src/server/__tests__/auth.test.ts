import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { authRoutes } from '../routes/auth';
import { makeToken, authHeader, TEST_SECRET, TEST_TENANT, TEST_USER, TEST_MEMBER } from './helpers/auth';
import { createMockDb } from './helpers/mock-db';

type TestEnv = { Bindings: Env; Variables: AppVariables };

function makeBindings(db: D1Database, overrides: Partial<Env> = {}): Env {
  return {
    JWT_SECRET: TEST_SECRET,
    DB: db,
    PHOTOS: {} as R2Bucket,
    GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
    OAUTH_REDIRECT_BASE: 'http://localhost',
    SENTRY_DSN: '',
    ...overrides,
  };
}

function makeApp(db: D1Database, overrides: Partial<Env> = {}) {
  const app = new Hono<TestEnv>();
  app.use('/api/auth/refresh', authMiddleware);
  app.use('/api/auth/me', authMiddleware);
  app.use('/api/auth/switch-tenant', authMiddleware);
  app.route('/api/auth', authRoutes);
  return { app, bindings: makeBindings(db, overrides) };
}

// ---- POST /api/auth/refresh ----

describe('POST /api/auth/refresh', () => {
  it('returns new token (200)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ userId: TEST_USER.id, tenantId: TEST_TENANT.id });
    const res = await app.request(
      '/api/auth/refresh',
      { method: 'POST', headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { token: string } };
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');

    // Verify the new token is valid and has correct payload
    const payload = await verify(body.data.token, TEST_SECRET, 'HS256') as Record<string, unknown>;
    expect(payload.userId).toBe(TEST_USER.id);
    expect(payload.tenantId).toBe(TEST_TENANT.id);
  });

  it('rejects without auth (401)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    const res = await app.request(
      '/api/auth/refresh',
      { method: 'POST' },
      bindings
    );

    expect(res.status).toBe(401);
  });
});

// ---- GET /api/auth/me ----

describe('GET /api/auth/me', () => {
  it('returns user profile with memberships (200)', async () => {
    const { db } = createMockDb({
      first: {
        'SELECT': TEST_USER,
      },
      all: {
        'tenant_members': [
          {
            tenant_id: 'tenant-1',
            tenant_name: "Mario's",
            tenant_slug: 'marios',
            role_id: 'role-owner',
            role_name: 'Owner',
            is_owner: 1,
          },
        ],
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ userId: TEST_USER.id, tenantId: TEST_TENANT.id });
    const res = await app.request(
      '/api/auth/me',
      { headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: {
        user: typeof TEST_USER;
        memberships: Array<{
          tenant_id: string;
          tenant_name: string;
          tenant_slug: string;
          role_id: string;
          role_name: string;
          is_owner: number;
        }>;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.user.id).toBe(TEST_USER.id);
    expect(body.data.user.email).toBe(TEST_USER.email);
    expect(Array.isArray(body.data.memberships)).toBe(true);
    expect(body.data.memberships[0].tenant_id).toBe('tenant-1');
    expect(body.data.memberships[0].role_name).toBe('Owner');
  });

  it('returns 404 when user not found', async () => {
    const { db } = createMockDb({
      first: {
        // No SELECT key — first() returns null
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ userId: TEST_USER.id });
    const res = await app.request(
      '/api/auth/me',
      { headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });

  it('rejects without auth (401)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    const res = await app.request('/api/auth/me', {}, bindings);

    expect(res.status).toBe(401);
  });
});

// ---- POST /api/auth/switch-tenant ----

describe('POST /api/auth/switch-tenant', () => {
  it('switches to valid tenant (200)', async () => {
    const { db } = createMockDb({
      first: {
        'tenant_members': { ...TEST_MEMBER, role_id: 'role-owner' },
      },
      all: {
        'permissions': [{ key: '*' }],
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ userId: TEST_USER.id });
    const res = await app.request(
      '/api/auth/switch-tenant',
      {
        method: 'POST',
        body: JSON.stringify({ tenant_id: 'tenant-1' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { token: string } };
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');

    // Verify new token has the correct tenantId
    const payload = await verify(body.data.token, TEST_SECRET, 'HS256') as Record<string, unknown>;
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.userId).toBe(TEST_USER.id);
  });

  it('rejects non-member tenant (403)', async () => {
    const { db } = createMockDb({
      first: {
        // No 'tenant_members' key — returns null (user not a member)
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ userId: TEST_USER.id });
    const res = await app.request(
      '/api/auth/switch-tenant',
      {
        method: 'POST',
        body: JSON.stringify({ tenant_id: 'tenant-other' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(403);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });

  it('rejects missing tenant_id (400)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ userId: TEST_USER.id });
    const res = await app.request(
      '/api/auth/switch-tenant',
      {
        method: 'POST',
        body: JSON.stringify({}),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });

  it('rejects without auth (401)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    const res = await app.request(
      '/api/auth/switch-tenant',
      {
        method: 'POST',
        body: JSON.stringify({ tenant_id: 'tenant-1' }),
        headers: { 'Content-Type': 'application/json' },
      },
      bindings
    );

    expect(res.status).toBe(401);
  });
});
