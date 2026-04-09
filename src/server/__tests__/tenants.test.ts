import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { tenantsRouter } from '../routes/tenants';
import { makeToken, authHeader, TEST_SECRET, TEST_TENANT, TEST_USER } from './helpers/auth';
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

// App for POST /api/tenants (auth only, no tenant scope)
function makeCreateApp(db: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/tenants/*', authMiddleware);
  app.route('/api/tenants', tenantsRouter);
  return { app, bindings: makeBindings(db) };
}

// App for GET/PATCH /api/t/:tenantId (auth + tenant scope)
function makeScopedApp(db: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/*', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId', tenantsRouter);
  return { app, bindings: makeBindings(db) };
}

// ---- POST /api/tenants ----

describe('POST /api/tenants', () => {
  it('creates tenant and makes user owner (201)', async () => {
    const { db } = createMockDb({
      first: {
        // slug uniqueness check returns null (no existing tenant)
        'SELECT id FROM tenants WHERE slug': null,
        // after insert, return the created tenant
        'SELECT * FROM tenants WHERE id': TEST_TENANT,
      },
    });
    const { app, bindings } = makeCreateApp(db);

    const token = await makeToken({ userId: TEST_USER.id });
    const res = await app.request(
      '/api/tenants',
      {
        method: 'POST',
        body: JSON.stringify({
          name: "Mario's Trattoria",
          slug: 'marios-trattoria',
          timezone: 'America/New_York',
        }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: typeof TEST_TENANT };
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe(TEST_TENANT.slug);
  });

  it('rejects duplicate slug (409)', async () => {
    const { db } = createMockDb({
      first: {
        // slug uniqueness check returns existing tenant
        'SELECT id FROM tenants WHERE slug': { id: 'existing-tenant' },
      },
    });
    const { app, bindings } = makeCreateApp(db);

    const token = await makeToken({ userId: TEST_USER.id });
    const res = await app.request(
      '/api/tenants',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate',
          slug: 'marios-trattoria',
        }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(409);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/slug/i);
  });

  it('rejects missing name (400)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeCreateApp(db);

    const token = await makeToken({ userId: TEST_USER.id });
    const res = await app.request(
      '/api/tenants',
      {
        method: 'POST',
        body: JSON.stringify({ slug: 'some-slug' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

// ---- GET /api/t/:tenantId ----

describe('GET /api/t/:tenantId', () => {
  it('returns tenant details (200)', async () => {
    const { db } = createMockDb({
      first: {
        'SELECT * FROM tenants WHERE id': TEST_TENANT,
      },
    });
    const { app, bindings } = makeScopedApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}`,
      { headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: typeof TEST_TENANT };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(TEST_TENANT.id);
  });

  it('returns 404 for unknown tenant', async () => {
    const { db } = createMockDb({
      first: {
        // no match key — returns null for any query
      },
    });
    const { app, bindings } = makeScopedApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}`,
      { headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

// ---- PATCH /api/t/:tenantId ----

describe('PATCH /api/t/:tenantId', () => {
  it('updates tenant (200)', async () => {
    const updatedTenant = { ...TEST_TENANT, name: 'Updated Name' };
    const { db } = createMockDb({
      first: {
        'SELECT * FROM tenants WHERE id': updatedTenant,
      },
    });
    const { app, bindings } = makeScopedApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: typeof updatedTenant };
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated Name');
  });
});
