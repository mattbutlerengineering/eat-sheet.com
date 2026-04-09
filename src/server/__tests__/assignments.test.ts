import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { assignmentRoutes } from '../routes/assignments';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_ASSIGNMENT = {
  id: 'assign-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  section_id: 'section-1',
  table_id: null,
  service_period_id: 'sp-1',
  date: '2026-04-09',
  created_at: '2026-04-09T00:00:00Z',
};

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/assignments/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/assignments', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/assignments', assignmentRoutes);

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

describe('GET /api/t/:tenantId/assignments', () => {
  it('lists assignments (200)', async () => {
    const { db } = createMockDb({
      all: { 'FROM assignments': [TEST_ASSIGNMENT] },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/assignments', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/t/:tenantId/assignments', () => {
  it('creates assignment (201)', async () => {
    const { db } = createMockDb({
      first: { 'FROM assignments': TEST_ASSIGNMENT },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/assignments', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        user_id: 'user-1',
        service_period_id: 'sp-1',
        date: '2026-04-09',
        section_id: 'section-1',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: typeof TEST_ASSIGNMENT };
    expect(body.success).toBe(true);
    expect(body.data.user_id).toBe('user-1');
  });

  it('rejects missing user_id (400)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/assignments', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        service_period_id: 'sp-1',
        date: '2026-04-09',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

describe('PATCH /api/t/:tenantId/assignments/:id', () => {
  it('updates assignment (200)', async () => {
    const updated = { ...TEST_ASSIGNMENT, section_id: 'section-2' };
    const { db } = createMockDb({
      first: { 'FROM assignments': updated },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/assignments/assign-1', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ section_id: 'section-2' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: typeof TEST_ASSIGNMENT };
    expect(body.success).toBe(true);
    expect(body.data.section_id).toBe('section-2');
  });
});

describe('DELETE /api/t/:tenantId/assignments/:id', () => {
  it('removes assignment (200)', async () => {
    const { db } = createMockDb({
      first: { 'FROM assignments': TEST_ASSIGNMENT },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/assignments/assign-1', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deleted: string } };
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe('assign-1');
  });
});
