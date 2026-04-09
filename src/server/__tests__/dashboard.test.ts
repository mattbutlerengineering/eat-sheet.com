import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { dashboardRoutes } from '../routes/dashboard';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/dashboard/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/dashboard', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/dashboard', dashboardRoutes);

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

describe('GET /api/t/:tenantId/dashboard', () => {
  it('returns json-render spec with stats (200)', async () => {
    const { db } = createMockDb({
      first: {
        "status IN ('confirmed', 'seated')": { count: 5 },
        "status = 'waiting'": { count: 3 },
      },
      all: {
        'GROUP BY t.status': [
          { status: 'available', count: 8 },
          { status: 'occupied', count: 4 },
        ],
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/dashboard', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it('spec contains expected element types (PageHeader, StatCard, CardGrid)', async () => {
    const { db } = createMockDb({
      first: {
        "status IN ('confirmed', 'seated')": { count: 2 },
        "status = 'waiting'": { count: 1 },
      },
      all: {
        'GROUP BY t.status': [
          { status: 'available', count: 10 },
        ],
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/dashboard', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: {
        root: string;
        elements: Record<string, { type: string; props?: Record<string, unknown>; children?: string[] }>;
      };
    };

    const { elements } = body.data;

    expect(elements['header']?.type).toBe('PageHeader');
    expect(elements['stats-grid']?.type).toBe('CardGrid');
    expect(elements['stat-reservations']?.type).toBe('StatCard');
    expect(elements['stat-waitlist']?.type).toBe('StatCard');
    expect(elements['stat-tables']?.type).toBe('StatCard');

    expect(elements['stat-reservations']?.props?.value).toBe(2);
    expect(elements['stat-waitlist']?.props?.value).toBe(1);
    expect(elements['stat-tables']?.props?.value).toBe(10);
  });
});
