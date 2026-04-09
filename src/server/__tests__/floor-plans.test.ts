import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { floorPlanRoutes, tableRoutes } from '../routes/floor-plans';
import { makeToken, authHeader, TEST_SECRET, TEST_TENANT } from './helpers/auth';
import { createMockDb } from './helpers/mock-db';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_FLOOR_PLAN = {
  id: 'fp-1',
  tenant_id: 'tenant-1',
  name: 'Main Floor',
  is_active: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const TEST_TABLE = {
  id: 'table-1',
  floor_plan_id: 'fp-1',
  section_id: null,
  tenant_id: 'tenant-1',
  label: 'T1',
  min_capacity: 2,
  max_capacity: 4,
  is_combinable: 0,
  status: 'available',
  position_x: 10,
  position_y: 20,
  created_at: '2026-01-01T00:00:00Z',
};

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

function makeApp(db: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/*', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/floor-plans', floorPlanRoutes);
  app.route('/api/t/:tenantId/tables', tableRoutes);
  return { app, bindings: makeBindings(db) };
}

// ---- GET /floor-plans ----

describe('GET /api/t/:tenantId/floor-plans', () => {
  it('lists floor plans (200)', async () => {
    const { db } = createMockDb({
      all: {
        'SELECT * FROM floor_plans': [TEST_FLOOR_PLAN],
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans`,
      { headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: typeof TEST_FLOOR_PLAN[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ---- POST /floor-plans ----

describe('POST /api/t/:tenantId/floor-plans', () => {
  it('creates floor plan (201)', async () => {
    const { db } = createMockDb({
      first: {
        'SELECT * FROM floor_plans WHERE id': TEST_FLOOR_PLAN,
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans`,
      {
        method: 'POST',
        body: JSON.stringify({ name: 'Main Floor' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: typeof TEST_FLOOR_PLAN };
    expect(body.success).toBe(true);
    expect(body.data).toBeTruthy();
  });

  it('rejects missing name (400)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans`,
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
});

// ---- GET /floor-plans/:id ----

describe('GET /api/t/:tenantId/floor-plans/:id', () => {
  it('returns floor plan with sections and tables (200)', async () => {
    const { db } = createMockDb({
      first: {
        'SELECT * FROM floor_plans WHERE id': TEST_FLOOR_PLAN,
      },
      all: {
        'SELECT * FROM sections': [],
        'SELECT * FROM tables': [TEST_TABLE],
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans/fp-1`,
      { headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: { floor_plan: typeof TEST_FLOOR_PLAN; sections: unknown[]; tables: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(body.data.floor_plan).toBeTruthy();
    expect(Array.isArray(body.data.sections)).toBe(true);
    expect(Array.isArray(body.data.tables)).toBe(true);
  });

  it('returns 404 for unknown floor plan', async () => {
    const { db } = createMockDb({
      first: {},
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans/nonexistent`,
      { headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

// ---- POST /floor-plans/:id/tables ----

describe('POST /api/t/:tenantId/floor-plans/:id/tables', () => {
  it('adds table (201)', async () => {
    const { db } = createMockDb({
      first: {
        'SELECT * FROM floor_plans WHERE id': TEST_FLOOR_PLAN,
        'SELECT * FROM tables WHERE id': TEST_TABLE,
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans/fp-1/tables`,
      {
        method: 'POST',
        body: JSON.stringify({ label: 'T1', min_capacity: 2, max_capacity: 4 }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: typeof TEST_TABLE };
    expect(body.success).toBe(true);
    expect(body.data).toBeTruthy();
  });

  it('returns 404 if floor plan not found', async () => {
    const { db } = createMockDb({
      first: {},
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans/nonexistent/tables`,
      {
        method: 'POST',
        body: JSON.stringify({ label: 'T1' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

// ---- PATCH /tables/:id/status ----

describe('PATCH /api/t/:tenantId/tables/:id/status', () => {
  it('updates table status (200)', async () => {
    const updatedTable = { ...TEST_TABLE, status: 'occupied' };
    const { db } = createMockDb({
      first: {
        'SELECT * FROM tables WHERE id': updatedTable,
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/tables/table-1/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'occupied' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: typeof updatedTable };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('occupied');
  });

  it('rejects invalid status (400)', async () => {
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/tables/table-1/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid-status' }),
        headers: authHeader(token),
      },
      bindings
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

// ---- DELETE /floor-plans/:id ----

describe('DELETE /api/t/:tenantId/floor-plans/:id', () => {
  it('rejects deleting active floor plan (400)', async () => {
    const { db } = createMockDb({
      first: {
        'SELECT * FROM floor_plans WHERE id': TEST_FLOOR_PLAN, // is_active: 1
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans/fp-1`,
      { method: 'DELETE', headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/active/i);
  });

  it('deletes inactive floor plan (200)', async () => {
    const inactiveFloorPlan = { ...TEST_FLOOR_PLAN, is_active: 0 };
    const { db } = createMockDb({
      first: {
        'SELECT * FROM floor_plans WHERE id': inactiveFloorPlan,
      },
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans/fp-1`,
      { method: 'DELETE', headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('returns 404 for unknown floor plan (404)', async () => {
    const { db } = createMockDb({
      first: {},
    });
    const { app, bindings } = makeApp(db);

    const token = await makeToken({ tenantId: TEST_TENANT.id });
    const res = await app.request(
      `/api/t/${TEST_TENANT.id}/floor-plans/nonexistent`,
      { method: 'DELETE', headers: authHeader(token) },
      bindings
    );

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});
