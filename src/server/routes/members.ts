import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Env, AppVariables, TenantMember, ApiResponse } from '../types';
import { requirePermission } from '../middleware/permission';

type MemberEnv = { Bindings: Env; Variables: AppVariables };

interface MemberWithUser extends TenantMember {
  readonly user_name: string;
  readonly user_email: string;
  readonly role_name: string;
}

const inviteSchema = z.object({
  email: z.string().email('Invalid email format'),
  role_id: z.string().min(1, 'role_id is required'),
});

const changeRoleSchema = z.object({
  role_id: z.string().min(1, 'role_id is required'),
});

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const DEFAULT_PAGE = 1;

export const memberRoutes = new Hono<MemberEnv>();

// GET / — List members with user info
memberRoutes.get('/', requirePermission('staff.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const rawPage = Number(c.req.query('page') ?? DEFAULT_PAGE);
  const rawLimit = Number(c.req.query('limit') ?? DEFAULT_LIMIT);

  const page = isNaN(rawPage) || rawPage < 1 ? DEFAULT_PAGE : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : Math.min(rawLimit, MAX_LIMIT);
  const offset = (page - 1) * limit;

  const countResult = await db
    .prepare('SELECT COUNT(*) as total FROM tenant_members WHERE tenant_id = ?')
    .bind(tenantId)
    .first<{ total: number }>();

  const total = countResult?.total ?? 0;

  const rows = await db
    .prepare(
      `SELECT tm.id, tm.tenant_id, tm.user_id, tm.role_id, tm.is_owner, tm.created_at,
              u.name as user_name, u.email as user_email, r.name as role_name
       FROM tenant_members tm
       JOIN users u ON u.id = tm.user_id
       JOIN roles r ON r.id = tm.role_id
       WHERE tm.tenant_id = ?
       ORDER BY tm.created_at ASC
       LIMIT ? OFFSET ?`
    )
    .bind(tenantId, limit, offset)
    .all<MemberWithUser>();

  const response: ApiResponse<MemberWithUser[]> = {
    success: true,
    data: rows.results,
    meta: { total, page, limit },
  };

  return c.json(response, 200);
});

// POST /invite — Invite user by email
memberRoutes.post('/invite', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { email, role_id } = parsed.data;

  const user = await db
    .prepare('SELECT id, name, email FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; name: string; email: string }>();

  if (!user) {
    return c.json(
      { success: false, error: 'User not found. They must register before being invited.' },
      404
    );
  }

  const id = nanoid();
  const member = await db
    .prepare(
      `INSERT INTO tenant_members (id, tenant_id, user_id, role_id, is_owner, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))
       RETURNING *`
    )
    .bind(id, tenantId, user.id, role_id)
    .first<TenantMember>();

  return c.json({ success: true, data: member }, 201);
});

// PATCH /:id — Change member's role
memberRoutes.patch('/:id', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { role_id } = parsed.data;

  const existing = await db
    .prepare('SELECT id, is_owner, role_id FROM tenant_members tm WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string; is_owner: number; role_id: string }>();

  if (!existing) {
    return c.json({ success: false, error: 'Member not found' }, 404);
  }

  // Guard: cannot demote the last owner
  if (existing.is_owner === 1) {
    const ownerCount = await db
      .prepare('SELECT COUNT(*) as total FROM tenant_members WHERE tenant_id = ? AND is_owner = 1')
      .bind(tenantId)
      .first<{ total: number }>();

    if ((ownerCount?.total ?? 0) <= 1) {
      return c.json({ success: false, error: 'Cannot change the role of the last owner' }, 400);
    }
  }

  const updated = await db
    .prepare(
      `UPDATE tenant_members SET role_id = ?, is_owner = 0
       WHERE id = ? AND tenant_id = ?
       RETURNING *`
    )
    .bind(role_id, id, tenantId)
    .first<TenantMember>();

  return c.json({ success: true, data: updated }, 200);
});

// DELETE /:id — Remove member from tenant
memberRoutes.delete('/:id', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const existing = await db
    .prepare('SELECT id, is_owner FROM tenant_members tm WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string; is_owner: number }>();

  if (!existing) {
    return c.json({ success: false, error: 'Member not found' }, 404);
  }

  // Guard: cannot remove the last owner
  if (existing.is_owner === 1) {
    const ownerCount = await db
      .prepare('SELECT COUNT(*) as total FROM tenant_members WHERE tenant_id = ? AND is_owner = 1')
      .bind(tenantId)
      .first<{ total: number }>();

    if ((ownerCount?.total ?? 0) <= 1) {
      return c.json({ success: false, error: 'Cannot remove the last owner' }, 400);
    }
  }

  await db
    .prepare('DELETE FROM tenant_members WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  return c.json({ success: true, data: { deleted: id } }, 200);
});
