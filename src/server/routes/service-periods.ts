import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';

type HonoEnv = { Bindings: Env; Variables: AppVariables };

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const createServicePeriodSchema = z.object({
  name: z.string().min(1).max(100),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(timeRegex, 'start_time must be in HH:MM format'),
  end_time: z.string().regex(timeRegex, 'end_time must be in HH:MM format'),
  max_reservations: z.number().int().positive().nullable().optional(),
  reservation_interval: z.number().int().positive().optional().default(15),
  turn_time: z.number().int().positive().optional().default(90),
  is_active: z.union([z.literal(0), z.literal(1)]).optional().default(1),
});

const updateServicePeriodSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(timeRegex, 'start_time must be in HH:MM format').optional(),
  end_time: z.string().regex(timeRegex, 'end_time must be in HH:MM format').optional(),
  max_reservations: z.number().int().positive().nullable().optional(),
  reservation_interval: z.number().int().positive().optional(),
  turn_time: z.number().int().positive().optional(),
  is_active: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const servicePeriodRoutes = new Hono<HonoEnv>();

// GET / — List all service periods for tenant
servicePeriodRoutes.get('/', requirePermission('shifts.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const { results } = await db
    .prepare('SELECT * FROM service_periods WHERE tenant_id = ? ORDER BY day_of_week, start_time')
    .bind(tenantId)
    .all();

  return c.json({ success: true, data: results }, 200);
});

// GET /today — Get today's active service periods
// NOTE: must be defined before /:id to avoid route conflict
servicePeriodRoutes.get('/today', requirePermission('shifts.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const todayDow = new Date().getDay();

  const { results } = await db
    .prepare(
      'SELECT * FROM service_periods WHERE tenant_id = ? AND day_of_week = ? AND is_active = 1 ORDER BY start_time'
    )
    .bind(tenantId, todayDow)
    .all();

  return c.json({ success: true, data: results }, 200);
});

// GET /current — Get currently active service period
// NOTE: must be defined before /:id to avoid route conflict
servicePeriodRoutes.get('/current', requirePermission('shifts.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const now = new Date();
  const todayDow = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const period = await db
    .prepare(
      'SELECT * FROM service_periods WHERE tenant_id = ? AND day_of_week = ? AND start_time <= ? AND end_time >= ? AND is_active = 1 ORDER BY start_time LIMIT 1'
    )
    .bind(tenantId, todayDow, currentTime, currentTime)
    .first();

  if (period === null) {
    return c.json({ success: false, error: 'No active service period at this time' }, 404);
  }

  return c.json({ success: true, data: period }, 200);
});

// POST / — Create service period
servicePeriodRoutes.post('/', requirePermission('shifts.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createServicePeriodSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') },
      400
    );
  }

  const {
    name,
    day_of_week,
    start_time,
    end_time,
    max_reservations,
    reservation_interval,
    turn_time,
    is_active,
  } = parsed.data;

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO service_periods
        (id, tenant_id, name, day_of_week, start_time, end_time, max_reservations, reservation_interval, turn_time, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, tenantId, name, day_of_week, start_time, end_time, max_reservations ?? null, reservation_interval, turn_time, is_active, now)
    .run();

  const created = await db
    .prepare('SELECT * FROM service_periods WHERE id = ?')
    .bind(id)
    .first();

  return c.json({ success: true, data: created }, 201);
});

// PATCH /:id — Update service period
servicePeriodRoutes.patch('/:id', requirePermission('shifts.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateServicePeriodSchema.safeParse(body);
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
    .prepare(`UPDATE service_periods SET ${setClauses} WHERE id = ? AND tenant_id = ?`)
    .bind(...values, id, tenantId)
    .run();

  const updated = await db
    .prepare('SELECT * FROM service_periods WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (updated === null) {
    return c.json({ success: false, error: 'Service period not found' }, 404);
  }

  return c.json({ success: true, data: updated }, 200);
});

// DELETE /:id — Delete service period
servicePeriodRoutes.delete('/:id', requirePermission('shifts.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;

  const existing = await db
    .prepare('SELECT id FROM service_periods WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string }>();

  if (existing === null) {
    return c.json({ success: false, error: 'Service period not found' }, 404);
  }

  await db
    .prepare('DELETE FROM service_periods WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  return c.json({ success: true, data: { deleted: id } }, 200);
});
