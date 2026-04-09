import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { requirePermission } from '../middleware/permission';
import { makeToken, authHeader, TEST_SECRET, TEST_TENANT, TEST_USER } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

function makeApp() {
  const app = new Hono<TestEnv>();
  return app;
}

function makeBindings(overrides: Partial<Env> = {}): Env {
  return {
    JWT_SECRET: TEST_SECRET,
    DB: {} as D1Database,
    PHOTOS: {} as R2Bucket,
    GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
    OAUTH_REDIRECT_BASE: 'http://localhost',
    SENTRY_DSN: '',
    ...overrides,
  };
}

// ---- authMiddleware ----

describe('authMiddleware', () => {
  it('rejects requests without Authorization header (401)', async () => {
    const app = makeApp();
    app.use('/test', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {}, makeBindings());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  it('rejects invalid JWT (401)', async () => {
    const app = makeApp();
    app.use('/test', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request(
      '/test',
      { headers: { Authorization: 'Bearer not-a-valid-jwt' } },
      makeBindings()
    );
    expect(res.status).toBe(401);
  });

  it('sets userId and tenantId from valid JWT (200)', async () => {
    const app = makeApp();
    app.use('/test', authMiddleware);
    app.get('/test', (c) =>
      c.json({ userId: c.get('userId'), tenantId: c.get('tenantId') })
    );

    const token = await makeToken();
    const res = await app.request(
      '/test',
      { headers: authHeader(token) },
      makeBindings()
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { userId: string; tenantId: string };
    expect(body.userId).toBe(TEST_USER.id);
    expect(body.tenantId).toBe(TEST_TENANT.id);
  });
});

// ---- tenantScope ----

describe('tenantScope', () => {
  it('rejects when JWT tenantId does not match URL :tenantId (403)', async () => {
    const app = makeApp();
    app.use('/tenants/:tenantId/data', authMiddleware, tenantScope);
    app.get('/tenants/:tenantId/data', (c) => c.json({ ok: true }));

    const token = await makeToken({ tenantId: 'tenant-1' });
    const res = await app.request(
      '/tenants/tenant-999/data',
      { headers: authHeader(token) },
      makeBindings()
    );
    expect(res.status).toBe(403);
  });

  it('allows when JWT tenantId matches URL :tenantId (200)', async () => {
    const app = makeApp();
    app.use('/tenants/:tenantId/data', authMiddleware, tenantScope);
    app.get('/tenants/:tenantId/data', (c) => c.json({ ok: true }));

    const token = await makeToken({ tenantId: 'tenant-1' });
    const res = await app.request(
      '/tenants/tenant-1/data',
      { headers: authHeader(token) },
      makeBindings()
    );
    expect(res.status).toBe(200);
  });
});

// ---- requirePermission ----

describe('requirePermission', () => {
  it('rejects when user lacks required permission (403)', async () => {
    const app = makeApp();
    app.use('/test', authMiddleware, requirePermission('reservations:write'));
    app.get('/test', (c) => c.json({ ok: true }));

    const token = await makeToken({ permissions: ['reservations:read'] });
    const res = await app.request(
      '/test',
      { headers: authHeader(token) },
      makeBindings()
    );
    expect(res.status).toBe(403);
  });

  it('allows when user has the required permission (200)', async () => {
    const app = makeApp();
    app.use('/test', authMiddleware, requirePermission('reservations:write'));
    app.get('/test', (c) => c.json({ ok: true }));

    const token = await makeToken({ permissions: ['reservations:write'] });
    const res = await app.request(
      '/test',
      { headers: authHeader(token) },
      makeBindings()
    );
    expect(res.status).toBe(200);
  });

  it('allows owner role with wildcard "*" (200)', async () => {
    const app = makeApp();
    app.use('/test', authMiddleware, requirePermission('anything:delete'));
    app.get('/test', (c) => c.json({ ok: true }));

    const token = await makeToken({ permissions: ['*'] });
    const res = await app.request(
      '/test',
      { headers: authHeader(token) },
      makeBindings()
    );
    expect(res.status).toBe(200);
  });
});
