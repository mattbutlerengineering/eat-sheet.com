import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';

type HonoEnv = { Bindings: Env; Variables: AppVariables };

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  timezone: z.string().optional().default('America/New_York'),
  settings: z.unknown().optional().nullable(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  settings: z.unknown().optional().nullable(),
});

export const tenantsRouter = new Hono<HonoEnv>();

// POST / — Create a new tenant (auth only, no tenant scope)
tenantsRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const { name, slug, timezone, settings } = parsed.data;
  const db = c.env.DB;
  const userId = c.get('userId');

  // Check slug uniqueness
  const existing = await db
    .prepare('SELECT id FROM tenants WHERE slug = ?')
    .bind(slug)
    .first<{ id: string }>();

  if (existing !== null) {
    return c.json({ success: false, error: 'slug is already taken' }, 409);
  }

  const tenantId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const memberId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();

  // Insert tenant
  await db
    .prepare(
      'INSERT INTO tenants (id, name, slug, timezone, settings, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(tenantId, name, slug, timezone, settings ?? null, now)
    .run();

  // Insert tenant_member (creator becomes owner)
  await db
    .prepare(
      'INSERT INTO tenant_members (id, tenant_id, user_id, role_id, is_owner, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(memberId, tenantId, userId, 'role-owner', 1, now)
    .run();

  // Return the created tenant
  const tenant = await db
    .prepare('SELECT * FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first();

  return c.json({ success: true, data: tenant }, 201);
});

// GET /:tenantId — Get tenant details (requires tenant.view permission)
tenantsRouter.get('/', requirePermission('tenant.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const tenant = await db
    .prepare('SELECT * FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first();

  if (tenant === null) {
    return c.json({ success: false, error: 'Tenant not found' }, 404);
  }

  return c.json({ success: true, data: tenant }, 200);
});

// PATCH /:tenantId — Update tenant (requires tenant.manage permission)
tenantsRouter.patch('/', requirePermission('tenant.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const updates = parsed.data;
  const fields = Object.entries(updates).filter(([, v]) => v !== undefined);

  if (fields.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);

  await db
    .prepare(`UPDATE tenants SET ${setClauses} WHERE id = ?`)
    .bind(...values, tenantId)
    .run();

  const tenant = await db
    .prepare('SELECT * FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first();

  if (tenant === null) {
    return c.json({ success: false, error: 'Tenant not found' }, 404);
  }

  return c.json({ success: true, data: tenant }, 200);
});
