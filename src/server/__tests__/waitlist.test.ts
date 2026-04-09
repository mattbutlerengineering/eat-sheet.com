import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { waitlistRoutes } from '../routes/waitlist';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_WAITLIST_ENTRY = {
  id: 'wl-1',
  tenant_id: 'tenant-1',
  guest_id: null,
  guest_name: 'Jane Walk-in',
  party_size: 2,
  phone: '555-0200',
  quoted_wait: 30,
  position: 1,
  status: 'waiting',
  notes: null,
  checked_in_at: '2026-04-09T19:00:00Z',
  seated_at: null,
  created_at: '2026-04-09T19:00:00Z',
};

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/waitlist/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/waitlist', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/waitlist', waitlistRoutes);

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

describe('GET /api/t/:tenantId/waitlist', () => {
  it('lists waitlist ordered by position (200)', async () => {
    const { db } = createMockDb({
      all: { 'FROM waitlist': [TEST_WAITLIST_ENTRY] },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/t/:tenantId/waitlist', () => {
  it('adds to waitlist with auto-position (201)', async () => {
    const { db } = createMockDb({
      first: {
        'MAX(position)': { max_position: 0 },
        'INSERT INTO waitlist': TEST_WAITLIST_ENTRY,
        'FROM service_periods': null,
        'FROM tables': null,
        'COUNT(*)': { count: 0 },
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ guest_name: 'Jane Walk-in', party_size: 2 }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects missing guest_name (400)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ party_size: 2 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

describe('PATCH /api/t/:tenantId/waitlist/:id/status', () => {
  it('transitions waiting → notified (200)', async () => {
    const notifiedEntry = { ...TEST_WAITLIST_ENTRY, status: 'notified' };
    const { db } = createMockDb({
      first: {
        'SELECT * FROM waitlist WHERE id': TEST_WAITLIST_ENTRY,
        'UPDATE waitlist': notifiedEntry,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/wl-1/status', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ status: 'notified' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { status: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('notified');
  });

  it('rejects invalid transition (400)', async () => {
    // waiting → seated is not a valid transition
    const { db } = createMockDb({
      first: {
        'SELECT * FROM waitlist WHERE id': TEST_WAITLIST_ENTRY,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/wl-1/status', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ status: 'seated' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/transition/i);
  });
});

describe('DELETE /api/t/:tenantId/waitlist/:id', () => {
  it('removes entry and returns success (200)', async () => {
    const { db } = createMockDb({
      first: {
        'SELECT * FROM waitlist WHERE id': TEST_WAITLIST_ENTRY,
      },
      all: {
        'FROM waitlist WHERE tenant_id': [TEST_WAITLIST_ENTRY],
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/wl-1', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deleted: string } };
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe('wl-1');
  });
});
