import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { memberRoutes } from '../routes/members';
import { createMockDb } from './helpers/mock-db';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';

type TestEnv = { Bindings: Env; Variables: AppVariables };

const TEST_MEMBER_WITH_USER = {
  id: 'member-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  role_id: 'role-owner',
  is_owner: 1,
  created_at: '2026-01-01T00:00:00Z',
  user_name: 'Matt',
  user_email: 'matt@example.com',
  role_name: 'Owner',
};

function makeApp(mockDb: D1Database) {
  const app = new Hono<TestEnv>();
  app.use('/api/t/:tenantId/members/*', authMiddleware, tenantScope);
  app.use('/api/t/:tenantId/members', authMiddleware, tenantScope);
  app.route('/api/t/:tenantId/members', memberRoutes);

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

describe('GET /api/t/:tenantId/members', () => {
  it('lists members with user info (200)', async () => {
    const { db } = createMockDb({
      all: { 'FROM tenant_members': [TEST_MEMBER_WITH_USER] },
      first: { 'COUNT(*)': { 'COUNT(*)': 1 } },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/members', {
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/t/:tenantId/members/invite', () => {
  it('invites existing user (201)', async () => {
    const existingUser = {
      id: 'user-2',
      email: 'sarah@example.com',
      name: 'Sarah',
    };
    const newMember = {
      id: 'member-2',
      tenant_id: 'tenant-1',
      user_id: 'user-2',
      role_id: 'role-staff',
      is_owner: 0,
      created_at: '2026-01-02T00:00:00Z',
    };
    const { db } = createMockDb({
      first: {
        'FROM users': existingUser,
        'INSERT INTO tenant_members': newMember,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/members/invite', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ email: 'sarah@example.com', role_id: 'role-staff' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects missing email (400)', async () => {
    const { db } = createMockDb({});
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/members/invite', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ role_id: 'role-staff' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

describe('PATCH /api/t/:tenantId/members/:id', () => {
  it('changes member role (200)', async () => {
    const updatedMember = { ...TEST_MEMBER_WITH_USER, role_id: 'role-manager', role_name: 'Manager' };
    // Two distinct owners so we can safely change the role of member-1
    const ownerCount = { total: 2 };
    const { db } = createMockDb({
      first: {
        'FROM tenant_members tm': TEST_MEMBER_WITH_USER,
        'COUNT(*)': ownerCount,
        'UPDATE tenant_members': updatedMember,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/members/member-1', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ role_id: 'role-manager' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe('DELETE /api/t/:tenantId/members/:id', () => {
  it('removes member (200)', async () => {
    // Two owners so it's safe to remove
    const ownerCount = { total: 2 };
    const { db } = createMockDb({
      first: {
        'FROM tenant_members tm': TEST_MEMBER_WITH_USER,
        'COUNT(*)': ownerCount,
      },
    });
    const request = makeApp(db);
    const token = await makeToken({ tenantId: 'tenant-1' });

    const res = await request('/api/t/tenant-1/members/member-1', {
      method: 'DELETE',
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deleted: string } };
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe('member-1');
  });
});
