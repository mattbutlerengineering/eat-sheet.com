import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';

type HonoEnv = { Bindings: Env; Variables: AppVariables };

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createAssignmentSchema = z.object({
  user_id: z.string().min(1),
  service_period_id: z.string().min(1),
  date: z.string().regex(dateRegex, 'date must be in YYYY-MM-DD format'),
  section_id: z.string().min(1).optional(),
  table_id: z.string().min(1).optional(),
});

const updateAssignmentSchema = z.object({
  section_id: z.string().min(1).nullable().optional(),
  table_id: z.string().min(1).nullable().optional(),
  service_period_id: z.string().min(1).optional(),
});

export const assignmentRoutes = new Hono<HonoEnv>();

// GET / — List assignments, supports filters: date, user_id, section_id
assignmentRoutes.get('/', requirePermission('staff.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const { date, user_id, section_id } = c.req.query();

  const conditions: string[] = ['tenant_id = ?'];
  const params: unknown[] = [tenantId];

  if (date) {
    conditions.push('date = ?');
    params.push(date);
  }
  if (user_id) {
    conditions.push('user_id = ?');
    params.push(user_id);
  }
  if (section_id) {
    conditions.push('section_id = ?');
    params.push(section_id);
  }

  const where = conditions.join(' AND ');
  const { results } = await db
    .prepare(`SELECT * FROM assignments WHERE ${where} ORDER BY date, created_at`)
    .bind(...params)
    .all();

  return c.json({ success: true, data: results }, 200);
});

// GET /today — Today's assignments with server names
// NOTE: must be defined before /:id to avoid route conflict
assignmentRoutes.get('/today', requirePermission('staff.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const today = new Date().toISOString().slice(0, 10);

  const { results } = await db
    .prepare(
      `SELECT a.*, u.name AS server_name
       FROM assignments a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.tenant_id = ? AND a.date = ?
       ORDER BY a.created_at`
    )
    .bind(tenantId, today)
    .all();

  return c.json({ success: true, data: results }, 200);
});

// POST / — Create assignment
assignmentRoutes.post('/', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const { user_id, service_period_id, date, section_id, table_id } = parsed.data;

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO assignments
        (id, tenant_id, user_id, service_period_id, date, section_id, table_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, tenantId, user_id, service_period_id, date, section_id ?? null, table_id ?? null, now)
    .run();

  const created = await db
    .prepare('SELECT * FROM assignments WHERE id = ?')
    .bind(id)
    .first();

  return c.json({ success: true, data: created }, 201);
});

// PATCH /:id — Update assignment
assignmentRoutes.patch('/:id', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateAssignmentSchema.safeParse(body);
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
    .prepare(`UPDATE assignments SET ${setClauses} WHERE id = ? AND tenant_id = ?`)
    .bind(...values, id, tenantId)
    .run();

  const updated = await db
    .prepare('SELECT * FROM assignments WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (updated === null) {
    return c.json({ success: false, error: 'Assignment not found' }, 404);
  }

  return c.json({ success: true, data: updated }, 200);
});

// DELETE /:id — Remove assignment
assignmentRoutes.delete('/:id', requirePermission('staff.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;

  const existing = await db
    .prepare('SELECT id FROM assignments WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string }>();

  if (existing === null) {
    return c.json({ success: false, error: 'Assignment not found' }, 404);
  }

  await db
    .prepare('DELETE FROM assignments WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  return c.json({ success: true, data: { deleted: id } }, 200);
});
