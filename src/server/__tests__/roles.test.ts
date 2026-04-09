import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { roleRoutes } from '../routes/roles';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_SYSTEM_ROLE = {
  id: 'role-owner',
  tenant_id: null,
  name: 'Owner',
  description: 'Full access',
  is_system: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const TEST_CUSTOM_ROLE = {
  id: 'role-custom-1',
  tenant_id: 'tenant-1',
  name: 'Shift Lead',
  description: 'Leads the shift',
  is_system: 0,
  created_at: '2026-01-02T00:00:00Z',
};

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/roles/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/roles', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/roles', roleRoutes);

  return (path: string, init?: RequestInit) =>
    app.request(path, init, {
      JWT_SECRET: TEST_SECRET,
      DB: mockDb,
      PHOTOS: {} as R2Bucket,
      GOOGLE_OAUTH_CLIENT_ID: 'client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
      OAUTH_REDIRECT_BASE: 'http://localhost',
      SENTRY_DSN: '',
    });
}

describe('GET /api/t/:tenantId/roles', () => {
  it('lists system + custom roles (200)', async () => {
    const { db } = createMockDb({
      all: { 'FROM roles': [TEST_SYSTEM_ROLE, TEST_CUSTOM_ROLE] },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/roles', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/t/:tenantId/roles', () => {
  it('creates custom role (201)', async () => {
    const { db } = createMockDb({
      first: { 'INSERT INTO roles': TEST_CUSTOM_ROLE },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/roles', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        name: 'Shift Lead',
        description: 'Leads the shift',
        permission_ids: [],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe('PATCH /api/t/:tenantId/roles/:id', () => {
  it('rejects modifying system role (400)', async () => {
    const { db } = createMockDb({
      first: { 'FROM roles': TEST_SYSTEM_ROLE },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/roles/role-owner', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ name: 'Super Owner' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/system/i);
  });
});

describe('DELETE /api/t/:tenantId/roles/:id', () => {
  it('rejects deleting system role (400)', async () => {
    const { db } = createMockDb({
      first: { 'FROM roles': TEST_SYSTEM_ROLE },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/roles/role-owner', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/system/i);
  });
});
