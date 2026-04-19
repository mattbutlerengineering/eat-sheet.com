import { nanoid } from "nanoid";
import type { GuestRow } from "./types";

export interface GuestListOptions {
  readonly tenantId: string;
  readonly q?: string | undefined;
  readonly tag?: string | undefined;
  readonly page: number;
  readonly limit: number;
  readonly sort: string;
  readonly order: string;
}

const ALLOWED_SORTS = new Set(["name", "created_at", "visit_count", "last_visit_at"]);
const ALLOWED_ORDERS = new Set(["asc", "desc"]);

function safeSortColumn(sort: string): string {
  return ALLOWED_SORTS.has(sort) ? sort : "created_at";
}

function safeOrder(order: string): string {
  return ALLOWED_ORDERS.has(order) ? order : "desc";
}

export async function countGuests(
  db: D1Database,
  tenantId: string,
  q?: string,
  tag?: string,
): Promise<number> {
  let sql = "SELECT COUNT(*) as count FROM guests WHERE tenant_id = ?";
  const binds: (string | number)[] = [tenantId];

  if (q) {
    const like = `%${q}%`;
    sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
    binds.push(like, like, like);
  }

  if (tag) {
    sql += " AND ? IN (SELECT value FROM json_each(tags))";
    binds.push(tag);
  }

  const result = await db
    .prepare(sql)
    .bind(...binds)
    .first<{ count: number }>();
  return result?.count ?? 0;
}

export async function findGuests(
  db: D1Database,
  opts: GuestListOptions,
): Promise<GuestRow[]> {
  let sql = "SELECT * FROM guests WHERE tenant_id = ?";
  const binds: (string | number)[] = [opts.tenantId];

  if (opts.q) {
    const like = `%${opts.q}%`;
    sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
    binds.push(like, like, like);
  }

  if (opts.tag) {
    sql += " AND ? IN (SELECT value FROM json_each(tags))";
    binds.push(opts.tag);
  }

  const sortCol = safeSortColumn(opts.sort);
  const sortDir = safeOrder(opts.order);
  sql += ` ORDER BY ${sortCol} ${sortDir}`;

  const offset = (opts.page - 1) * opts.limit;
  sql += " LIMIT ? OFFSET ?";
  binds.push(opts.limit, offset);

  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<GuestRow>();
  return results;
}

export async function findGuestById(
  db: D1Database,
  guestId: string,
  tenantId: string,
): Promise<GuestRow | null> {
  const result = await db
    .prepare("SELECT * FROM guests WHERE id = ? AND tenant_id = ?")
    .bind(guestId, tenantId)
    .first<GuestRow>();
  return result ?? null;
}

export async function createGuest(
  db: D1Database,
  tenantId: string,
  data: {
    readonly name: string;
    readonly email: string;
    readonly phone: string;
    readonly notes: string;
    readonly tags: readonly string[];
  },
): Promise<GuestRow> {
  const id = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO guests (id, tenant_id, name, email, phone, notes, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      data.name,
      data.email || null,
      data.phone || null,
      data.notes || null,
      JSON.stringify(data.tags),
      now,
      now,
    )
    .run();

  const row = await findGuestById(db, id, tenantId);
  return row!;
}

export async function updateGuest(
  db: D1Database,
  guestId: string,
  tenantId: string,
  fields: {
    readonly name?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly notes?: string;
    readonly tags?: readonly string[];
  },
): Promise<void> {
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (fields.name !== undefined) {
    updates.push("name = ?");
    values.push(fields.name);
  }
  if (fields.email !== undefined) {
    updates.push("email = ?");
    values.push(fields.email || null);
  }
  if (fields.phone !== undefined) {
    updates.push("phone = ?");
    values.push(fields.phone || null);
  }
  if (fields.notes !== undefined) {
    updates.push("notes = ?");
    values.push(fields.notes || null);
  }
  if (fields.tags !== undefined) {
    updates.push("tags = ?");
    values.push(JSON.stringify(fields.tags));
  }

  if (updates.length === 0) return;

  const now = new Date().toISOString();
  updates.push("updated_at = ?");
  values.push(now, guestId, tenantId);

  await db
    .prepare(
      `UPDATE guests SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
    )
    .bind(...values)
    .run();
}

export async function deleteGuest(
  db: D1Database,
  guestId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM guests WHERE id = ? AND tenant_id = ?")
    .bind(guestId, tenantId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
