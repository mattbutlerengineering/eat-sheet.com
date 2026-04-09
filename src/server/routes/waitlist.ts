import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Env, AppVariables, WaitlistEntry, ApiResponse } from '../types';
import { requirePermission } from '../middleware/permission';
import {
  canTransitionWaitlist,
  estimateWait,
  rebalancePositions,
} from '../services/waitlist-service';

type WaitlistEnv = { Bindings: Env; Variables: AppVariables };

const createWaitlistSchema = z.object({
  guest_name: z.string().min(1, 'guest_name is required'),
  party_size: z.number().int().min(1, 'party_size must be at least 1'),
  guest_id: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateWaitlistSchema = z.object({
  guest_name: z.string().min(1).optional(),
  party_size: z.number().int().min(1).optional(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(['notified', 'seated', 'left', 'cancelled']),
});

const reorderSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(1),
    })
  ),
});

export const waitlistRoutes = new Hono<WaitlistEnv>();

// GET / — List current waitlist (waiting or notified, ordered by position)
waitlistRoutes.get('/', requirePermission('waitlist.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT * FROM waitlist
       WHERE tenant_id = ? AND status IN ('waiting', 'notified')
       ORDER BY position ASC`
    )
    .bind(tenantId)
    .all<WaitlistEntry>();

  const response: ApiResponse<WaitlistEntry[]> = {
    success: true,
    data: results,
  };

  return c.json(response, 200);
});

// GET /estimate — Get wait estimate for a given party size
// IMPORTANT: defined before /:id routes to avoid route shadowing
waitlistRoutes.get('/estimate', requirePermission('waitlist.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const rawPartySize = c.req.query('party_size');
  if (!rawPartySize) {
    return c.json({ success: false, error: 'party_size query param is required' }, 400);
  }

  const partySize = Number(rawPartySize);
  if (isNaN(partySize) || partySize < 1) {
    return c.json({ success: false, error: 'party_size must be a positive integer' }, 400);
  }

  const estimated_minutes = await estimateWait(db, tenantId, partySize);

  return c.json({ success: true, data: { estimated_minutes } }, 200);
});

// POST / — Add to waitlist
waitlistRoutes.post('/', requirePermission('waitlist.create'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createWaitlistSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { guest_name, party_size, guest_id, phone, notes } = parsed.data;

  // Auto-assign position (MAX(position) + 1 for this tenant's waiting entries)
  const maxResult = await db
    .prepare(
      `SELECT MAX(position) as max_position FROM waitlist
       WHERE tenant_id = ? AND status = 'waiting'`
    )
    .bind(tenantId)
    .first<{ max_position: number | null }>();

  const position = (maxResult?.max_position ?? 0) + 1;

  // Calculate quoted_wait via estimateWait
  const quoted_wait = await estimateWait(db, tenantId, party_size);

  const id = nanoid();
  const now = new Date().toISOString();

  const entry = await db
    .prepare(
      `INSERT INTO waitlist
         (id, tenant_id, guest_id, guest_name, party_size, phone, quoted_wait, position, status, notes, checked_in_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?)
       RETURNING *`
    )
    .bind(
      id,
      tenantId,
      guest_id ?? null,
      guest_name,
      party_size,
      phone ?? null,
      quoted_wait,
      position,
      notes ?? null,
      now,
      now
    )
    .first<WaitlistEntry>();

  return c.json({ success: true, data: entry }, 201);
});

// PATCH /:id — Update waitlist entry fields
waitlistRoutes.patch('/:id', requirePermission('waitlist.update'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateWaitlistSchema.safeParse(body);
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

  const entry = await db
    .prepare(
      `UPDATE waitlist SET ${setClauses} WHERE id = ? AND tenant_id = ? RETURNING *`
    )
    .bind(...values, id, tenantId)
    .first<WaitlistEntry>();

  if (!entry) {
    return c.json({ success: false, error: 'Waitlist entry not found' }, 404);
  }

  return c.json({ success: true, data: entry }, 200);
});

// PATCH /:id/status — Change waitlist entry status
waitlistRoutes.patch('/:id/status', requirePermission('waitlist.update'), async (c) => {
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

  const { status: newStatus } = parsed.data;

  // Fetch current entry to validate transition
  const current = await db
    .prepare('SELECT * FROM waitlist WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<WaitlistEntry>();

  if (!current) {
    return c.json({ success: false, error: 'Waitlist entry not found' }, 404);
  }

  if (!canTransitionWaitlist(current.status, newStatus)) {
    return c.json(
      {
        success: false,
        error: `Invalid transition from '${current.status}' to '${newStatus}'`,
      },
      400
    );
  }

  const seatedAt = newStatus === 'seated' ? new Date().toISOString() : null;

  const setClauses = seatedAt !== null ? 'status = ?, seated_at = ?' : 'status = ?';
  const bindValues: unknown[] = seatedAt !== null
    ? [newStatus, seatedAt, id, tenantId]
    : [newStatus, id, tenantId];

  const updated = await db
    .prepare(
      `UPDATE waitlist SET ${setClauses} WHERE id = ? AND tenant_id = ? RETURNING *`
    )
    .bind(...bindValues)
    .first<WaitlistEntry>();

  if (!updated) {
    return c.json({ success: false, error: 'Waitlist entry not found' }, 404);
  }

  // Rebalance positions when entry leaves the active waitlist
  if (newStatus === 'left' || newStatus === 'cancelled') {
    await rebalancePositions(db, tenantId);
  }

  return c.json({ success: true, data: updated }, 200);
});

// DELETE /:id — Remove from waitlist then rebalance
waitlistRoutes.delete('/:id', requirePermission('waitlist.delete'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const id = c.req.param('id');

  const existing = await db
    .prepare('SELECT * FROM waitlist WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<WaitlistEntry>();

  if (!existing) {
    return c.json({ success: false, error: 'Waitlist entry not found' }, 404);
  }

  await db
    .prepare('DELETE FROM waitlist WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  await rebalancePositions(db, tenantId);

  return c.json({ success: true, data: { deleted: id } }, 200);
});

// POST /reorder — Reorder waitlist entries
waitlistRoutes.post('/reorder', requirePermission('waitlist.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation error';
    return c.json({ success: false, error: firstError }, 400);
  }

  const { entries } = parsed.data;

  for (const { id, position } of entries) {
    await db
      .prepare('UPDATE waitlist SET position = ? WHERE id = ? AND tenant_id = ?')
      .bind(position, id, tenantId)
      .run();
  }

  return c.json({ success: true, data: { reordered: entries.length } }, 200);
});
