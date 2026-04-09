import { sign } from 'hono/jwt';

export const TEST_SECRET = 'test-jwt-secret-for-tests';

export const TEST_TENANT = {
  id: 'tenant-1',
  name: "Mario's Trattoria",
  slug: 'marios-trattoria',
  timezone: 'America/New_York',
  settings: null,
  created_at: '2026-01-01T00:00:00Z',
};

export const TEST_USER = {
  id: 'user-1',
  email: 'matt@example.com',
  name: 'Matt',
  oauth_provider: 'google',
  oauth_id: 'google-123',
  created_at: '2026-01-01T00:00:00Z',
};

export const TEST_USER_2 = {
  id: 'user-2',
  email: 'sarah@example.com',
  name: 'Sarah',
  oauth_provider: 'google',
  oauth_id: 'google-456',
  created_at: '2026-01-02T00:00:00Z',
};

export const TEST_MEMBER = {
  id: 'member-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  role_id: 'role-owner',
  is_owner: 1,
  created_at: '2026-01-01T00:00:00Z',
};

export async function makeToken(
  overrides: Partial<{
    userId: string;
    tenantId: string;
    roleId: string;
    permissions: string[];
  }> = {}
): Promise<string> {
  return sign(
    {
      userId: overrides.userId ?? TEST_USER.id,
      tenantId: overrides.tenantId ?? TEST_TENANT.id,
      roleId: overrides.roleId ?? 'role-owner',
      permissions: overrides.permissions ?? ['*'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_SECRET
  );
}

export function authHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
