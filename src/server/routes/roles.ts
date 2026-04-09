import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Env, AppVariables, Role, ApiResponse } from '../types';
import { requirePermission } from '../middleware/permission';

type RoleEnv = { Bindings: Env; Variables: AppVariables };

interface RoleWithPermissions extends Role {
  readonly permissions: string[];
}

const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  permission_ids: z.array(z.string()).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permission_ids: z.array(z.string()).optional(),
});

export const roleRoutes = new Hono<RoleEnv>();

// GET / — List system roles + tenant custom roles, each with permission keys
roleRoutes.get('/', requirePermission('staff.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const rows = await db
    .prepare(
      `SELECT r.id, r.tenant_id, r.name, r.description, r.is_system, r.created_at,
              GROUP_CONCAT(p.key) as permission_keys
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE r.tenant_id IS NULL OR r.tenant_id = ?
       GROUP BY r.id
       ORDER BY r.is_system DESC, r.name ASC`
    )
    .bind(tenantId)
    .all<Role & { permission_keys: string | null }>();

  const data: RoleWithPermissions[] = rows.results.map((row) => ({
    ...row,
    permissions: row.permission_keys ? row.permission_keys.split(',') : [],
  }));

  const response: ApiResponse<RoleWithPermissions[]> = {
    success: true,
    data,
  };

  return c.json(response, 200);
});

// POST / — Create custom role
roleRoutes.post('/', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { name, description, permission_ids } = parsed.data;
  const id = nanoid();

  const role = await db
    .prepare(
      `INSERT INTO roles (id, tenant_id, name, description, is_system, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))
       RETURNING *`
    )
    .bind(id, tenantId, name, description ?? null)
    .first<Role>();

  if (permission_ids.length > 0) {
    const placeholders = permission_ids.map(() => '(?, ?)').join(', ');
    const values = permission_ids.flatMap((pid) => [id, pid]);
    await db
      .prepare(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${placeholders}`)
      .bind(...values)
      .run();
  }

  return c.json({ success: true, data: role }, 201);
});

// PATCH /:id — Update custom role (reject system roles)
roleRoutes.patch('/:id', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const existing = await db
    .prepare('SELECT id, is_system, tenant_id FROM roles WHERE id = ?')
    .bind(id)
    .first<{ id: string; is_system: number; tenant_id: string | null }>();

  if (!existing) {
    return c.json({ success: false, error: 'Role not found' }, 404);
  }

  if (existing.is_system === 1) {
    return c.json({ success: false, error: 'Cannot modify a system role' }, 400);
  }

  if (existing.tenant_id !== tenantId) {
    return c.json({ success: false, error: 'Role not found' }, 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { name, description, permission_ids } = parsed.data;

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) {
    setClauses.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    setClauses.push('description = ?');
    values.push(description);
  }

  let updated: Role | null = existing as unknown as Role;

  if (setClauses.length > 0) {
    updated = await db
      .prepare(`UPDATE roles SET ${setClauses.join(', ')} WHERE id = ? RETURNING *`)
      .bind(...values, id)
      .first<Role>();
  }

  if (permission_ids !== undefined) {
    await db
      .prepare('DELETE FROM role_permissions WHERE role_id = ?')
      .bind(id)
      .run();

    if (permission_ids.length > 0) {
      const placeholders = permission_ids.map(() => '(?, ?)').join(', ');
      const permValues = permission_ids.flatMap((pid) => [id, pid]);
      await db
        .prepare(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${placeholders}`)
        .bind(...permValues)
        .run();
    }
  }

  return c.json({ success: true, data: updated }, 200);
});

// DELETE /:id — Delete custom role (reject system roles, reject if members use it)
roleRoutes.delete('/:id', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const existing = await db
    .prepare('SELECT id, is_system, tenant_id FROM roles WHERE id = ?')
    .bind(id)
    .first<{ id: string; is_system: number; tenant_id: string | null }>();

  if (!existing) {
    return c.json({ success: false, error: 'Role not found' }, 404);
  }

  if (existing.is_system === 1) {
    return c.json({ success: false, error: 'Cannot delete a system role' }, 400);
  }

  if (existing.tenant_id !== tenantId) {
    return c.json({ success: false, error: 'Role not found' }, 404);
  }

  const memberCount = await db
    .prepare('SELECT COUNT(*) as total FROM tenant_members WHERE role_id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ total: number }>();

  if ((memberCount?.total ?? 0) > 0) {
    return c.json(
      { success: false, error: 'Cannot delete role: members still assigned to it. Reassign them first.' },
      400
    );
  }

  await db.prepare('DELETE FROM role_permissions WHERE role_id = ?').bind(id).run();
  await db.prepare('DELETE FROM roles WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();

  return c.json({ success: true, data: { deleted: id } }, 200);
});
