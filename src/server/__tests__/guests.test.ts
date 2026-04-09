import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { guestRoutes } from '../routes/guests';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_GUEST = {
  id: 'guest-1',
  tenant_id: 'tenant-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-0100',
  tags: '["vip"]',
  notes: 'Prefers booth',
  visit_count: 5,
  last_visit_at: '2026-03-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/guests/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/guests', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/guests', guestRoutes);

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

describe('GET /api/t/:tenantId/guests', () => {
  it('lists guests for tenant (200)', async () => {
    const { db } = createMockDb({
      all: { 'FROM guests': [TEST_GUEST] },
      first: { 'COUNT(*)': { 'COUNT(*)': 1 } },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/guests', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/t/:tenantId/guests', () => {
  it('creates a guest (201)', async () => {
    const { db } = createMockDb({
      first: { 'INSERT INTO guests': TEST_GUEST },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/guests', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects missing name (400)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/guests', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ email: 'no-name@example.com' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

describe('GET /api/t/:tenantId/guests/:id', () => {
  it('returns single guest (200)', async () => {
    const { db } = createMockDb({
      first: { 'FROM guests': TEST_GUEST },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/guests/guest-1', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('guest-1');
  });

  it('returns 404 for unknown guest', async () => {
    const { db } = createMockDb({
      first: { 'FROM guests': null },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/guests/unknown-id', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/t/:tenantId/guests/:id', () => {
  it('updates guest (200)', async () => {
    const updated = { ...TEST_GUEST, name: 'Jane Doe' };
    const { db } = createMockDb({
      first: { 'UPDATE guests': updated },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/guests/guest-1', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ name: 'Jane Doe' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe('DELETE /api/t/:tenantId/guests/:id', () => {
  it('deletes guest (200)', async () => {
    const { db } = createMockDb({
      first: { 'FROM guests': TEST_GUEST },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/guests/guest-1', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deleted: string } };
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe('guest-1');
  });
});
