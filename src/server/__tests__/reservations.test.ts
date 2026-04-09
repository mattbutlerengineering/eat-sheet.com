import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { reservationRoutes } from '../routes/reservations';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

// Mock the services
vi.mock('../services/reservation-service', () => ({
  transitionReservation: vi.fn(),
}));
vi.mock('../services/availability-service', () => ({
  getAvailableSlots: vi.fn(),
}));

import { transitionReservation } from '../services/reservation-service';
import { getAvailableSlots } from '../services/availability-service';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_RESERVATION = {
  id: 'res-1',
  tenant_id: 'tenant-1',
  guest_id: 'guest-1',
  table_id: 'table-1',
  service_period_id: 'sp-1',
  party_size: 4,
  date: '2026-04-10',
  time: '19:00',
  status: 'confirmed',
  notes: 'Birthday dinner',
  created_by: 'user-1',
  created_at: '2026-04-09T00:00:00Z',
  updated_at: null,
};

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/reservations/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/reservations', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/reservations', reservationRoutes);

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

describe('GET /api/t/:tenantId/reservations', () => {
  it('lists reservations with date filter (200)', async () => {
    const { db } = createMockDb({
      all: { 'FROM reservations': [TEST_RESERVATION] },
      first: { 'COUNT(*)': { 'COUNT(*)': 1 } },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations?date=2026-04-10', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/t/:tenantId/reservations', () => {
  it('creates reservation (201)', async () => {
    const { db } = createMockDb({
      first: { 'INSERT INTO reservations': TEST_RESERVATION },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        guest_id: 'guest-1',
        party_size: 4,
        date: '2026-04-10',
        time: '19:00',
        notes: 'Birthday dinner',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects missing guest_id (400)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        party_size: 4,
        date: '2026-04-10',
        time: '19:00',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

describe('GET /api/t/:tenantId/reservations/:id', () => {
  it('returns reservation (200)', async () => {
    const { db } = createMockDb({
      first: { 'FROM reservations': TEST_RESERVATION },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations/res-1', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('res-1');
  });

  it('returns 404 for unknown reservation', async () => {
    const { db } = createMockDb({
      first: { 'FROM reservations': null },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations/unknown-id', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/t/:tenantId/reservations/:id/status', () => {
  it('transitions confirmed to seated (200)', async () => {
    const { db } = createMockDb({});
    vi.mocked(transitionReservation).mockResolvedValueOnce({ success: true });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations/res-1/status', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ status: 'seated' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects invalid transition (400)', async () => {
    const { db } = createMockDb({});
    vi.mocked(transitionReservation).mockResolvedValueOnce({
      success: false,
      error: "Cannot transition reservation from 'confirmed' to 'completed'",
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations/res-1/status', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ status: 'completed' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('Cannot transition');
  });
});

describe('DELETE /api/t/:tenantId/reservations/:id', () => {
  it('deletes reservation (200)', async () => {
    const { db } = createMockDb({
      first: { 'FROM reservations': TEST_RESERVATION },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/reservations/res-1', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deleted: string } };
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe('res-1');
  });
});
