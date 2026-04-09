import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Env, AppVariables, Guest, ApiResponse } from '../types';
import { requirePermission } from '../middleware/permission';

type GuestEnv = { Bindings: Env; Variables: AppVariables };

const createGuestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

const updateGuestSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const DEFAULT_PAGE = 1;

export const guestRoutes = new Hono<GuestEnv>();

// GET / — List guests with optional search and tag filter
guestRoutes.get('/', requirePermission('guests.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const rawPage = Number(c.req.query('page') ?? DEFAULT_PAGE);
  const rawLimit = Number(c.req.query('limit') ?? DEFAULT_LIMIT);
  const search = c.req.query('search');
  const tag = c.req.query('tag');

  const page = isNaN(rawPage) || rawPage < 1 ? DEFAULT_PAGE : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : Math.min(rawLimit, MAX_LIMIT);
  const offset = (page - 1) * limit;

  const conditions: string[] = ['tenant_id = ?'];
  const params: unknown[] = [tenantId];

  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  if (tag) {
    conditions.push("tags LIKE ?");
    params.push(`%${tag}%`);
  }

  const where = conditions.join(' AND ');

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM guests WHERE ${where}`)
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total ?? 0;

  const rows = await db
    .prepare(`SELECT * FROM guests WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all<Guest>();

  const response: ApiResponse<Guest[]> = {
    success: true,
    data: rows.results,
    meta: { total, page, limit },
  };

  return c.json(response, 200);
});

// POST / — Create guest
guestRoutes.post('/', requirePermission('guests.create'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createGuestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { name, email, phone, tags, notes } = parsed.data;
  const id = nanoid();

  const guest = await db
    .prepare(
      `INSERT INTO guests (id, tenant_id, name, email, phone, tags, notes, visit_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
       RETURNING *`
    )
    .bind(id, tenantId, name, email ?? null, phone ?? null, tags ?? null, notes ?? null)
    .first<Guest>();

  return c.json({ success: true, data: guest }, 201);
});

// GET /:id — Get single guest
guestRoutes.get('/:id', requirePermission('guests.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const guest = await db
    .prepare('SELECT * FROM guests WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Guest>();

  if (!guest) {
    return c.json({ success: false, error: 'Guest not found' }, 404);
  }

  return c.json({ success: true, data: guest }, 200);
});

// GET /:id/visits — Guest visit history
guestRoutes.get('/:id/visits', requirePermission('guests.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const rows = await db
    .prepare(
      `SELECT * FROM reservations
       WHERE guest_id = ? AND tenant_id = ? AND status IN ('completed', 'seated')
       ORDER BY date DESC`
    )
    .bind(id, tenantId)
    .all();

  return c.json({ success: true, data: rows.results }, 200);
});

// PATCH /:id — Update guest
guestRoutes.patch('/:id', requirePermission('guests.update'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateGuestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const fields = parsed.data;
  const fieldNames = Object.keys(fields) as Array<keyof typeof fields>;

  if (fieldNames.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  const setClauses = fieldNames.map((f) => `${f} = ?`).join(', ');
  const values = fieldNames.map((f) => fields[f] ?? null);

  const guest = await db
    .prepare(
      `UPDATE guests SET ${setClauses} WHERE id = ? AND tenant_id = ? RETURNING *`
    )
    .bind(...values, id, tenantId)
    .first<Guest>();

  if (!guest) {
    return c.json({ success: false, error: 'Guest not found' }, 404);
  }

  return c.json({ success: true, data: guest }, 200);
});

// DELETE /:id — Delete guest
guestRoutes.delete('/:id', requirePermission('guests.delete'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const existing = await db
    .prepare('SELECT id FROM guests WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    return c.json({ success: false, error: 'Guest not found' }, 404);
  }

  await db
    .prepare('DELETE FROM guests WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  return c.json({ success: true, data: { deleted: id } }, 200);
});
