import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { servicePeriodRoutes } from '../routes/service-periods';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_SERVICE_PERIOD = {
  id: 'sp-1',
  tenant_id: 'tenant-1',
  name: 'Dinner',
  day_of_week: 3,
  start_time: '17:00',
  end_time: '22:00',
  max_reservations: null,
  reservation_interval: 15,
  turn_time: 90,
  is_active: 1,
  created_at: '2026-01-01T00:00:00Z',
};

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/service-periods/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/service-periods', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/service-periods', servicePeriodRoutes);

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

describe('GET /api/t/:tenantId/service-periods', () => {
  it('lists service periods (200)', async () => {
    const { db } = createMockDb({
      all: { 'FROM service_periods': [TEST_SERVICE_PERIOD] },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/service-periods', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/t/:tenantId/service-periods', () => {
  it('creates service period (201)', async () => {
    const { db } = createMockDb({
      first: { 'FROM service_periods': TEST_SERVICE_PERIOD },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/service-periods', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        name: 'Dinner',
        day_of_week: 3,
        start_time: '17:00',
        end_time: '22:00',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { name: string } };
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Dinner');
  });

  it('validates day_of_week range (400 for invalid)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/service-periods', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        name: 'Dinner',
        day_of_week: 9,
        start_time: '17:00',
        end_time: '22:00',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

describe('PATCH /api/t/:tenantId/service-periods/:id', () => {
  it('updates service period (200)', async () => {
    const updated = { ...TEST_SERVICE_PERIOD, name: 'Brunch' };
    const { db } = createMockDb({
      first: { 'FROM service_periods': updated },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/service-periods/sp-1', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ name: 'Brunch' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { name: string } };
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Brunch');
  });
});

describe('DELETE /api/t/:tenantId/service-periods/:id', () => {
  it('deletes service period (200)', async () => {
    const { db } = createMockDb({
      first: { 'FROM service_periods': TEST_SERVICE_PERIOD },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/service-periods/sp-1', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deleted: string } };
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe('sp-1');
  });

  it('returns 404 for unknown service period', async () => {
    const { db } = createMockDb({
      first: {},
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/service-periods/unknown-id', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});
