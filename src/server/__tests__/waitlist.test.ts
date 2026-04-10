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

describe('PATCH /api/t/:tenantId/waitlist/:id', () => {
  it('updates waitlist entry fields (200)', async () => {
    const updatedEntry = { ...TEST_WAITLIST_ENTRY, guest_name: 'Jane Updated', party_size: 3 };
    const { db } = createMockDb({
      first: {
        'UPDATE waitlist SET': updatedEntry,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/wl-1', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ guest_name: 'Jane Updated', party_size: 3 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { guest_name: string; party_size: number } };
    expect(body.success).toBe(true);
    expect(body.data.guest_name).toBe('Jane Updated');
    expect(body.data.party_size).toBe(3);
  });

  it('returns 404 for unknown entry (404)', async () => {
    const { db } = createMockDb({
      first: {},
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/nonexistent', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ guest_name: 'Nobody' }),
    });

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});

describe('PATCH /api/t/:tenantId/waitlist/:id/status (seated from notified)', () => {
  it('transitions notified → seated (sets seated_at) (200)', async () => {
    const notifiedEntry = { ...TEST_WAITLIST_ENTRY, status: 'notified' };
    const seatedEntry = { ...notifiedEntry, status: 'seated', seated_at: '2026-04-09T19:30:00Z' };
    const { db } = createMockDb({
      first: {
        'SELECT * FROM waitlist WHERE id': notifiedEntry,
        'UPDATE waitlist SET': seatedEntry,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/wl-1/status', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ status: 'seated' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { status: string; seated_at: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('seated');
    expect(body.data.seated_at).toBeTruthy();
  });
});

describe('GET /api/t/:tenantId/waitlist/estimate', () => {
  it('returns estimated wait for a party size (200)', async () => {
    const { db } = createMockDb({
      first: {
        'COUNT(*)': { count: 3 },
        'FROM service_periods': null,
        'FROM tables': null,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/estimate?party_size=2', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { estimated_minutes: number } };
    expect(body.success).toBe(true);
    expect(typeof body.data.estimated_minutes).toBe('number');
  });

  it('returns 400 when party_size is missing (400)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/estimate', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/party_size/i);
  });
});

describe('POST /api/t/:tenantId/waitlist/reorder', () => {
  it('reorders waitlist entries (200)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/reorder', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        entries: [
          { id: 'wl-1', position: 2 },
          { id: 'wl-2', position: 1 },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { reordered: number } };
    expect(body.success).toBe(true);
    expect(body.data.reordered).toBe(2);
  });

  it('rejects missing entries array (400)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/reorder', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
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

  it('returns 404 for unknown entry (404)', async () => {
    const { db } = createMockDb({
      first: {},
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/waitlist/nonexistent', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
  });
});
