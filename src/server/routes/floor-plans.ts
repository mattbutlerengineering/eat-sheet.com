import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';

type HonoEnv = { Bindings: Env; Variables: AppVariables };

// ---- Schemas ----

const createFloorPlanSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateFloorPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

const createSectionSchema = z.object({
  name: z.string().min(1).max(100),
  sort_order: z.number().int().default(0),
});

const updateSectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().optional(),
});

const createTableSchema = z.object({
  label: z.string().min(1).max(50),
  section_id: z.string().optional().nullable(),
  min_capacity: z.number().int().min(1).default(1),
  max_capacity: z.number().int().min(1).default(4),
  is_combinable: z.number().int().min(0).max(1).default(0),
  position_x: z.number().optional().nullable(),
  position_y: z.number().optional().nullable(),
});

const updateTableSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  section_id: z.string().optional().nullable(),
  min_capacity: z.number().int().min(1).optional(),
  max_capacity: z.number().int().min(1).optional(),
  is_combinable: z.number().int().min(0).max(1).optional(),
  position_x: z.number().optional().nullable(),
  position_y: z.number().optional().nullable(),
});

const TABLE_STATUSES = ['available', 'occupied', 'reserved', 'blocked'] as const;

const updateTableStatusSchema = z.object({
  status: z.enum(TABLE_STATUSES),
});

// ---- Floor Plan Routes ----

export const floorPlanRoutes = new Hono<HonoEnv>();

// GET / — List floor plans
floorPlanRoutes.get('/', requirePermission('floor.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const { results } = await db
    .prepare('SELECT * FROM floor_plans WHERE tenant_id = ? ORDER BY created_at ASC')
    .bind(tenantId)
    .all();

  return c.json({ success: true, data: results }, 200);
});

// POST / — Create floor plan
floorPlanRoutes.post('/', requirePermission('floor.manage'), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createFloorPlanSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const { name } = parsed.data;
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();

  await db
    .prepare(
      'INSERT INTO floor_plans (id, tenant_id, name, is_active, created_at) VALUES (?, ?, ?, 0, ?)'
    )
    .bind(id, tenantId, name, now)
    .run();

  const floorPlan = await db
    .prepare('SELECT * FROM floor_plans WHERE id = ?')
    .bind(id)
    .first();

  return c.json({ success: true, data: floorPlan }, 201);
});

// GET /:id — Get floor plan with sections and tables
floorPlanRoutes.get('/:id', requirePermission('floor.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const db = c.env.DB;

  const floorPlan = await db
    .prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (floorPlan === null) {
    return c.json({ success: false, error: 'Floor plan not found' }, 404);
  }

  const { results: sections } = await db
    .prepare(
      'SELECT * FROM sections WHERE floor_plan_id = ? AND tenant_id = ? ORDER BY sort_order ASC'
    )
    .bind(id, tenantId)
    .all();

  const { results: tables } = await db
    .prepare('SELECT * FROM tables WHERE floor_plan_id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .all();

  return c.json({ success: true, data: { floor_plan: floorPlan, sections, tables } }, 200);
});

// PATCH /:id — Update floor plan
floorPlanRoutes.patch('/:id', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateFloorPlanSchema.safeParse(body);
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

  // If activating this floor plan, deactivate all others first
  if (updates.is_active === 1) {
    await db
      .prepare('UPDATE floor_plans SET is_active = 0 WHERE tenant_id = ? AND id != ?')
      .bind(tenantId, id)
      .run();
  }

  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);

  await db
    .prepare(`UPDATE floor_plans SET ${setClauses} WHERE id = ? AND tenant_id = ?`)
    .bind(...values, id, tenantId)
    .run();

  const floorPlan = await db
    .prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (floorPlan === null) {
    return c.json({ success: false, error: 'Floor plan not found' }, 404);
  }

  return c.json({ success: true, data: floorPlan }, 200);
});

// DELETE /:id — Delete floor plan
floorPlanRoutes.delete('/:id', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const db = c.env.DB;

  const floorPlan = await db
    .prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string; is_active: number }>();

  if (floorPlan === null) {
    return c.json({ success: false, error: 'Floor plan not found' }, 404);
  }

  if (floorPlan.is_active === 1) {
    return c.json({ success: false, error: 'Cannot delete the active floor plan' }, 400);
  }

  await db
    .prepare('DELETE FROM floor_plans WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  return c.json({ success: true, data: null }, 200);
});

// POST /:id/sections — Add section to floor plan
floorPlanRoutes.post('/:id/sections', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id: floorPlanId } = c.req.param();
  const db = c.env.DB;

  const floorPlan = await db
    .prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?')
    .bind(floorPlanId, tenantId)
    .first<{ id: string }>();

  if (floorPlan === null) {
    return c.json({ success: false, error: 'Floor plan not found' }, 404);
  }

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const { name, sort_order } = parsed.data;
  const sectionId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();

  await db
    .prepare(
      'INSERT INTO sections (id, floor_plan_id, tenant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(sectionId, floorPlanId, tenantId, name, sort_order, now)
    .run();

  const section = await db
    .prepare('SELECT * FROM sections WHERE id = ?')
    .bind(sectionId)
    .first();

  return c.json({ success: true, data: section }, 201);
});

// POST /:id/tables — Add table to floor plan
floorPlanRoutes.post('/:id/tables', requirePermission('tables.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id: floorPlanId } = c.req.param();
  const db = c.env.DB;

  const floorPlan = await db
    .prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?')
    .bind(floorPlanId, tenantId)
    .first<{ id: string }>();

  if (floorPlan === null) {
    return c.json({ success: false, error: 'Floor plan not found' }, 404);
  }

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createTableSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const {
    label,
    section_id,
    min_capacity,
    max_capacity,
    is_combinable,
    position_x,
    position_y,
  } = parsed.data;

  const tableId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO tables
        (id, floor_plan_id, section_id, tenant_id, label, min_capacity, max_capacity,
         is_combinable, status, position_x, position_y, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?)`
    )
    .bind(
      tableId,
      floorPlanId,
      section_id ?? null,
      tenantId,
      label,
      min_capacity,
      max_capacity,
      is_combinable,
      position_x ?? null,
      position_y ?? null,
      now
    )
    .run();

  const table = await db
    .prepare('SELECT * FROM tables WHERE id = ?')
    .bind(tableId)
    .first();

  return c.json({ success: true, data: table }, 201);
});

// ---- Section Routes (mounted within floorPlanRoutes) ----

// PATCH /sections/:id — Update section
floorPlanRoutes.patch('/sections/:id', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateSectionSchema.safeParse(body);
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
    .prepare(`UPDATE sections SET ${setClauses} WHERE id = ? AND tenant_id = ?`)
    .bind(...values, id, tenantId)
    .run();

  const section = await db
    .prepare('SELECT * FROM sections WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (section === null) {
    return c.json({ success: false, error: 'Section not found' }, 404);
  }

  return c.json({ success: true, data: section }, 200);
});

// ---- Table Routes ----

export const tableRoutes = new Hono<HonoEnv>();

// PATCH /:id — Update table
tableRoutes.patch('/:id', requirePermission('tables.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateTableSchema.safeParse(body);
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
    .prepare(`UPDATE tables SET ${setClauses} WHERE id = ? AND tenant_id = ?`)
    .bind(...values, id, tenantId)
    .run();

  const table = await db
    .prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (table === null) {
    return c.json({ success: false, error: 'Table not found' }, 404);
  }

  return c.json({ success: true, data: table }, 200);
});

// PATCH /:id/status — Quick status change
tableRoutes.patch('/:id/status', requirePermission('tables.update_status'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateTableStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const { status } = parsed.data;

  await db
    .prepare('UPDATE tables SET status = ? WHERE id = ? AND tenant_id = ?')
    .bind(status, id, tenantId)
    .run();

  const table = await db
    .prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (table === null) {
    return c.json({ success: false, error: 'Table not found' }, 404);
  }

  return c.json({ success: true, data: table }, 200);
});

// DELETE /:id — Remove table
tableRoutes.delete('/:id', requirePermission('tables.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const db = c.env.DB;

  const table = await db
    .prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string }>();

  if (table === null) {
    return c.json({ success: false, error: 'Table not found' }, 404);
  }

  await db
    .prepare('DELETE FROM tables WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  return c.json({ success: true, data: null }, 200);
});
