import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';
import { transitionReservation } from '../services/reservation-service';
import { getAvailableSlots } from '../services/availability-service';

type HonoEnv = { Bindings: Env; Variables: AppVariables };

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createReservationSchema = z.object({
  guest_id: z.string().min(1, 'guest_id is required'),
  party_size: z.number().int().min(1, 'party_size must be at least 1'),
  date: z.string().regex(dateRegex, 'date must be in YYYY-MM-DD format'),
  time: z.string().regex(timeRegex, 'time must be in HH:MM format'),
  table_id: z.string().optional(),
  service_period_id: z.string().optional(),
  notes: z.string().optional(),
});

const updateReservationSchema = z.object({
  party_size: z.number().int().min(1).optional(),
  date: z.string().regex(dateRegex, 'date must be in YYYY-MM-DD format').optional(),
  time: z.string().regex(timeRegex, 'time must be in HH:MM format').optional(),
  table_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum(['seated', 'completed', 'no_show', 'cancelled'], {
    errorMap: () => ({ message: "status must be one of 'seated', 'completed', 'no_show', 'cancelled'" }),
  }),
});

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const DEFAULT_PAGE = 1;

export const reservationRoutes = new Hono<HonoEnv>();

// GET /availability — Check available slots (MUST be before /:id)
reservationRoutes.get('/availability', requirePermission('reservations.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const date = c.req.query('date');
  const rawPartySize = c.req.query('party_size');

  if (!date || !dateRegex.test(date)) {
    return c.json({ success: false, error: 'date query param is required (YYYY-MM-DD)' }, 400);
  }

  const partySize = Number(rawPartySize);
  if (!rawPartySize || isNaN(partySize) || partySize < 1) {
    return c.json({ success: false, error: 'party_size query param is required and must be a positive integer' }, 400);
  }

  const slots = await getAvailableSlots(db, tenantId, date, partySize);

  return c.json({ success: true, data: slots }, 200);
});

// GET / — List reservations
reservationRoutes.get('/', requirePermission('reservations.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const rawPage = Number(c.req.query('page') ?? DEFAULT_PAGE);
  const rawLimit = Number(c.req.query('limit') ?? DEFAULT_LIMIT);
  const date = c.req.query('date');
  const status = c.req.query('status');
  const guestId = c.req.query('guest_id');

  const page = isNaN(rawPage) || rawPage < 1 ? DEFAULT_PAGE : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : Math.min(rawLimit, MAX_LIMIT);
  const offset = (page - 1) * limit;

  const conditions: string[] = ['tenant_id = ?'];
  const params: unknown[] = [tenantId];

  if (date) {
    conditions.push('date = ?');
    params.push(date);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (guestId) {
    conditions.push('guest_id = ?');
    params.push(guestId);
  }

  const where = conditions.join(' AND ');

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM reservations WHERE ${where}`)
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total ?? 0;

  const rows = await db
    .prepare(`SELECT * FROM reservations WHERE ${where} ORDER BY date ASC, time ASC LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all();

  return c.json(
    { success: true, data: rows.results, meta: { total, page, limit } },
    200
  );
});

// POST / — Create reservation
reservationRoutes.post('/', requirePermission('reservations.create'), async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  const db = c.env.DB;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { guest_id, party_size, date, time, table_id, service_period_id, notes } = parsed.data;
  const id = nanoid();

  const reservation = await db
    .prepare(
      `INSERT INTO reservations
         (id, tenant_id, guest_id, party_size, date, time, table_id, service_period_id, notes, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, datetime('now'))
       RETURNING *`
    )
    .bind(
      id,
      tenantId,
      guest_id,
      party_size,
      date,
      time,
      table_id ?? null,
      service_period_id ?? null,
      notes ?? null,
      userId
    )
    .first();

  return c.json({ success: true, data: reservation }, 201);
});

// GET /:id — Get single reservation
reservationRoutes.get('/:id', requirePermission('reservations.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const reservation = await db
    .prepare('SELECT * FROM reservations WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (!reservation) {
    return c.json({ success: false, error: 'Reservation not found' }, 404);
  }

  return c.json({ success: true, data: reservation }, 200);
});

// PATCH /:id — Update reservation details
reservationRoutes.patch('/:id', requirePermission('reservations.update'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateReservationSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const fields = parsed.data;
  const fieldNames = Object.keys(fields) as Array<keyof typeof fields>;

  if (fieldNames.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  const setClauses = [...fieldNames.map((f) => `${f} = ?`), "updated_at = datetime('now')"].join(', ');
  const values = fieldNames.map((f) => fields[f] ?? null);

  const reservation = await db
    .prepare(`UPDATE reservations SET ${setClauses} WHERE id = ? AND tenant_id = ? RETURNING *`)
    .bind(...values, id, tenantId)
    .first();

  if (!reservation) {
    return c.json({ success: false, error: 'Reservation not found' }, 404);
  }

  return c.json({ success: true, data: reservation }, 200);
});

// PATCH /:id/status — Change reservation status via state machine
reservationRoutes.patch('/:id/status', requirePermission('reservations.update'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { status } = parsed.data;
  const result = await transitionReservation(db, tenantId, id, status);

  if (!result.success) {
    return c.json({ success: false, error: result.error ?? 'Transition failed' }, 400);
  }

  return c.json({ success: true, data: { id, status } }, 200);
});

// DELETE /:id — Delete reservation
reservationRoutes.delete('/:id', requirePermission('reservations.delete'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const existing = await db
    .prepare('SELECT id FROM reservations WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    return c.json({ success: false, error: 'Reservation not found' }, 404);
  }

  await db
    .prepare('DELETE FROM reservations WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  return c.json({ success: true, data: { deleted: id } }, 200);
});
