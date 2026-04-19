# Guest Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the guest management feature (CRUD, search, tags, pagination) following the existing feature module pattern.

**Architecture:** New server feature module at `src/server/features/guests/` (routes → service → repository), shared Zod schemas + TypeScript types, client page with search and pagination. Follows exact patterns from venues and floor-plans modules.

**Tech Stack:** Hono routes, D1 queries, Zod validation, React 19, react-hook-form

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/server/db/migrations/004_guests.sql` | DB migration |
| Modify | `src/server/db/schema.sql` | Append guests table definition |
| Create | `src/shared/types/guest.ts` | Guest API type |
| Modify | `src/shared/types/index.ts` | Re-export Guest type |
| Create | `src/shared/schemas/guest.ts` | Zod create/update schemas |
| Modify | `src/shared/schemas/index.ts` | Re-export guest schemas |
| Create | `src/server/features/guests/types.ts` | GuestRow DB interface |
| Create | `src/server/features/guests/repository.ts` | D1 queries |
| Create | `src/server/features/guests/service.ts` | GuestRow → Guest transform |
| Create | `src/server/features/guests/routes.ts` | HTTP endpoints |
| Modify | `src/server/index.ts` | Mount guest routes |
| Create | `src/server/features/guests/__tests__/routes.test.ts` | Route tests |
| Create | `src/client/features/guests/components/GuestList.tsx` | List + search + pagination |
| Create | `src/client/features/guests/components/GuestForm.tsx` | Create/edit form |
| Create | `src/client/features/guests/components/GuestDetail.tsx` | Detail drawer |
| Create | `src/client/features/guests/hooks/useGuests.ts` | Data fetching hook |
| Create | `src/client/features/guests/index.ts` | Barrel export |
| Create | `src/client/pages/Guests.tsx` | Page component |
| Modify | `src/client/App.tsx` | Add /guests route |
| Modify | `src/client/pages/Dashboard.tsx` | Wire up Guests nav link |

---

### Task 1: Database Migration + Schema

**Files:**
- Create: `src/server/db/migrations/004_guests.sql`
- Modify: `src/server/db/schema.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 004_guests.sql
CREATE TABLE guests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    visit_count INTEGER NOT NULL DEFAULT 0,
    last_visit_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_guests_tenant ON guests(tenant_id);
CREATE INDEX idx_guests_tenant_email ON guests(tenant_id, email);
CREATE INDEX idx_guests_tenant_phone ON guests(tenant_id, phone);
```

- [ ] **Step 2: Append to schema.sql**

Add the same table definition and indexes at the end of `src/server/db/schema.sql` after the `idx_fpt_floor_plan` index.

- [ ] **Step 3: Apply migration locally**

Run: `npx wrangler d1 execute eat-sheet-db --local --file=src/server/db/migrations/004_guests.sql`
Expected: table created successfully

- [ ] **Step 4: Commit**

```bash
git add src/server/db/migrations/004_guests.sql src/server/db/schema.sql
git commit -m "feat: add guests table migration (#84)"
```

---

### Task 2: Shared Types + Schemas

**Files:**
- Create: `src/shared/types/guest.ts`
- Modify: `src/shared/types/index.ts`
- Create: `src/shared/schemas/guest.ts`
- Modify: `src/shared/schemas/index.ts`

- [ ] **Step 1: Create shared Guest type**

Create `src/shared/types/guest.ts`:

```typescript
export interface Guest {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly tags: readonly string[];
  readonly visitCount: number;
  readonly lastVisitAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

- [ ] **Step 2: Re-export from types index**

Add to end of `src/shared/types/index.ts`:

```typescript
export type { Guest } from "./guest";
```

- [ ] **Step 3: Create Zod schemas**

Create `src/shared/schemas/guest.ts`:

```typescript
import { z } from "zod";

export const createGuestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(200).or(z.literal("")).optional().default(""),
  phone: z.string().max(20).optional().default(""),
  notes: z.string().max(500).optional().default(""),
  tags: z.array(z.string().max(50)).max(20).default([]),
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email").max(200).or(z.literal("")).optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
```

- [ ] **Step 4: Re-export from schemas index**

Add to end of `src/shared/schemas/index.ts`:

```typescript
export { createGuestSchema, updateGuestSchema } from "./guest";
export type { CreateGuestInput, UpdateGuestInput } from "./guest";
```

- [ ] **Step 5: Run type check**

Run: `pnpm build`
Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/guest.ts src/shared/types/index.ts src/shared/schemas/guest.ts src/shared/schemas/index.ts
git commit -m "feat: add guest shared types and Zod schemas (#84)"
```

---

### Task 3: Server Types + Repository

**Files:**
- Create: `src/server/features/guests/types.ts`
- Create: `src/server/features/guests/repository.ts`

- [ ] **Step 1: Create GuestRow type**

Create `src/server/features/guests/types.ts`:

```typescript
export interface GuestRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly tags: string;
  readonly visit_count: number;
  readonly last_visit_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
```

- [ ] **Step 2: Create repository**

Create `src/server/features/guests/repository.ts`:

```typescript
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
```

- [ ] **Step 3: Run type check**

Run: `pnpm build`
Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/server/features/guests/types.ts src/server/features/guests/repository.ts
git commit -m "feat: add guest repository with CRUD, search, tag filter (#84)"
```

---

### Task 4: Server Service + Routes

**Files:**
- Create: `src/server/features/guests/service.ts`
- Create: `src/server/features/guests/routes.ts`
- Modify: `src/server/index.ts`

- [ ] **Step 1: Create service (row → API transform)**

Create `src/server/features/guests/service.ts`:

```typescript
import type { GuestRow } from "./types";
import type { Guest } from "@shared/types/guest";

export function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    tags: JSON.parse(row.tags) as string[],
    visitCount: row.visit_count,
    lastVisitAt: row.last_visit_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

- [ ] **Step 2: Create routes**

Create `src/server/features/guests/routes.ts`:

```typescript
import { Hono } from "hono";
import type { AppEnv } from "@server/types";
import { ok, paginated } from "@server/response";
import { NotFoundError, ValidationError } from "@server/errors";
import {
  authMiddleware,
  requirePermission,
} from "@server/features/auth/middleware";
import { createGuestSchema, updateGuestSchema } from "@shared/schemas/guest";
import {
  findGuests,
  findGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  countGuests,
} from "./repository";
import { toGuest } from "./service";

export const guests = new Hono<AppEnv>();

guests.use("/:tenantId/guests/*", authMiddleware);
guests.use("/:tenantId/guests", authMiddleware);

// List guests (paginated, searchable, filterable)
guests.get(
  "/:tenantId/guests",
  requirePermission("guests:read"),
  async (c) => {
    const { tenantId } = c.req.param();
    const q = c.req.query("q") || undefined;
    const tag = c.req.query("tag") || undefined;
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 50));
    const sort = c.req.query("sort") || "created_at";
    const order = c.req.query("order") || "desc";

    const [rows, total] = await Promise.all([
      findGuests(c.env.DB, { tenantId, q, tag, page, limit, sort, order }),
      countGuests(c.env.DB, tenantId, q, tag),
    ]);

    return c.json(paginated(rows.map(toGuest), { total, page, limit }));
  },
);

// Get single guest
guests.get(
  "/:tenantId/guests/:guestId",
  requirePermission("guests:read"),
  async (c) => {
    const { tenantId, guestId } = c.req.param();
    const row = await findGuestById(c.env.DB, guestId, tenantId);
    if (!row) {
      throw new NotFoundError(`Guest not found: ${guestId}`);
    }
    return c.json(ok(toGuest(row)));
  },
);

// Create guest
guests.post(
  "/:tenantId/guests",
  requirePermission("guests:write"),
  async (c) => {
    const { tenantId } = c.req.param();
    const body = await c.req.json();
    const parsed = createGuestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Validation failed",
      );
    }
    const row = await createGuest(c.env.DB, tenantId, parsed.data);
    return c.json(ok(toGuest(row)), 201);
  },
);

// Update guest
guests.patch(
  "/:tenantId/guests/:guestId",
  requirePermission("guests:write"),
  async (c) => {
    const { tenantId, guestId } = c.req.param();
    const existing = await findGuestById(c.env.DB, guestId, tenantId);
    if (!existing) {
      throw new NotFoundError(`Guest not found: ${guestId}`);
    }
    const body = await c.req.json();
    const parsed = updateGuestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Validation failed",
      );
    }
    await updateGuest(c.env.DB, guestId, tenantId, parsed.data);
    const updated = await findGuestById(c.env.DB, guestId, tenantId);
    return c.json(ok(toGuest(updated!)));
  },
);

// Delete guest
guests.delete(
  "/:tenantId/guests/:guestId",
  requirePermission("guests:write"),
  async (c) => {
    const { tenantId, guestId } = c.req.param();
    const deleted = await deleteGuest(c.env.DB, guestId, tenantId);
    if (!deleted) {
      throw new NotFoundError(`Guest not found: ${guestId}`);
    }
    return c.json(ok({ deleted: true }));
  },
);
```

- [ ] **Step 3: Mount routes in server index**

In `src/server/index.ts`, add import and route:

```typescript
// After line 11 (import { onboarding })
import { guests } from "./features/guests/routes";

// After line 38 (app.route("/api/onboarding", onboarding))
app.route("/api/t", guests);
```

- [ ] **Step 4: Run type check**

Run: `pnpm build`
Expected: no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/server/features/guests/service.ts src/server/features/guests/routes.ts src/server/index.ts
git commit -m "feat: add guest routes with CRUD, search, pagination (#84)"
```

---

### Task 5: Server Route Tests

**Files:**
- Create: `src/server/features/guests/__tests__/routes.test.ts`

- [ ] **Step 1: Write route tests**

Create `src/server/features/guests/__tests__/routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { AppEnv } from "@server/types";
import { DomainError } from "@server/errors";
import { error } from "@server/response";
import type { GuestRow } from "../types";

vi.mock("../repository", () => ({
  findGuests: vi.fn(),
  findGuestById: vi.fn(),
  createGuest: vi.fn(),
  updateGuest: vi.fn(),
  deleteGuest: vi.fn(),
  countGuests: vi.fn(),
}));

import {
  findGuests,
  findGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  countGuests,
} from "../repository";
import { guests } from "../routes";

const mockFindGuests = findGuests as ReturnType<typeof vi.fn>;
const mockFindById = findGuestById as ReturnType<typeof vi.fn>;
const mockCreate = createGuest as ReturnType<typeof vi.fn>;
const mockUpdate = updateGuest as ReturnType<typeof vi.fn>;
const mockDelete = deleteGuest as ReturnType<typeof vi.fn>;
const mockCount = countGuests as ReturnType<typeof vi.fn>;

const JWT_SECRET = "test-secret";

async function makeToken(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  return sign(
    {
      sub: "user-1",
      email: "test@example.com",
      name: "Test User",
      tenantId: "tenant-1",
      roleId: "role-1",
      permissions: ["*"],
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    },
    JWT_SECRET,
  );
}

function buildApp() {
  const app = new Hono<AppEnv>();
  app.route("/api/t", guests);
  app.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json(error(err.message), err.statusCode as 400);
    }
    return c.json(error("Internal server error"), 500);
  });
  return app;
}

const GUEST_ROW: GuestRow = {
  id: "guest-1",
  tenant_id: "tenant-1",
  name: "Sarah Johnson",
  email: "sarah@example.com",
  phone: "+1-555-0123",
  notes: "Prefers booth seating",
  tags: '["regular","vip"]',
  visit_count: 5,
  last_visit_at: "2026-04-10T19:30:00.000Z",
  created_at: "2026-03-01T10:00:00.000Z",
  updated_at: "2026-04-10T19:30:00.000Z",
};

const mockDb = {} as unknown as D1Database;
const env = { JWT_SECRET, DB: mockDb } as AppEnv["Bindings"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/t/:tenantId/guests", () => {
  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request("/api/t/tenant-1/guests", {}, env);
    expect(res.status).toBe(401);
  });

  it("returns 403 without guests:read permission", async () => {
    const app = buildApp();
    const token = await makeToken({ permissions: ["floor_plans:read"] });
    const res = await app.request(
      "/api/t/tenant-1/guests",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("returns paginated guest list", async () => {
    mockFindGuests.mockResolvedValueOnce([GUEST_ROW]);
    mockCount.mockResolvedValueOnce(1);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ total: 1, page: 1, limit: 50 });
    const guest = (body.data as Record<string, unknown>[])[0];
    expect(guest.name).toBe("Sarah Johnson");
    expect(guest.tags).toEqual(["regular", "vip"]);
    expect(guest.visitCount).toBe(5);
  });

  it("passes search query to repository", async () => {
    mockFindGuests.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const app = buildApp();
    const token = await makeToken();
    await app.request(
      "/api/t/tenant-1/guests?q=sarah&tag=vip&page=2&limit=10&sort=name&order=asc",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(mockFindGuests).toHaveBeenCalledWith(mockDb, {
      tenantId: "tenant-1",
      q: "sarah",
      tag: "vip",
      page: 2,
      limit: 10,
      sort: "name",
      order: "asc",
    });
  });
});

describe("GET /api/t/:tenantId/guests/:guestId", () => {
  it("returns a single guest", async () => {
    mockFindById.mockResolvedValueOnce(GUEST_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/guest-1",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.data as Record<string, unknown>).name).toBe("Sarah Johnson");
  });

  it("returns 404 for missing guest", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/missing",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /api/t/:tenantId/guests", () => {
  it("creates a guest and returns 201", async () => {
    mockCreate.mockResolvedValueOnce(GUEST_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Sarah Johnson",
          email: "sarah@example.com",
          phone: "+1-555-0123",
          notes: "Prefers booth seating",
          tags: ["regular", "vip"],
        }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });

  it("returns 400 for missing name", async () => {
    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "a@b.com" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });

  it("returns 403 without guests:write permission", async () => {
    const app = buildApp();
    const token = await makeToken({ permissions: ["guests:read"] });
    const res = await app.request(
      "/api/t/tenant-1/guests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Test" }),
      },
      env,
    );

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/t/:tenantId/guests/:guestId", () => {
  it("updates a guest", async () => {
    const updatedRow = { ...GUEST_ROW, name: "Sarah J." };
    mockFindById
      .mockResolvedValueOnce(GUEST_ROW)
      .mockResolvedValueOnce(updatedRow);
    mockUpdate.mockResolvedValueOnce(undefined);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/guest-1",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Sarah J." }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.data as Record<string, unknown>).name).toBe("Sarah J.");
  });

  it("returns 404 for non-existent guest", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/missing",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Updated" }),
      },
      env,
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/t/:tenantId/guests/:guestId", () => {
  it("deletes a guest", async () => {
    mockDelete.mockResolvedValueOnce(true);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/guest-1",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.data as Record<string, unknown>).deleted).toBe(true);
  });

  it("returns 404 when guest does not exist", async () => {
    mockDelete.mockResolvedValueOnce(false);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/missing",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test src/server/features/guests/__tests__/routes.test.ts`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/server/features/guests/__tests__/routes.test.ts
git commit -m "test: add guest route tests (#84)"
```

---

### Task 6: Client Data Fetching Hook

**Files:**
- Create: `src/client/features/guests/hooks/useGuests.ts`

- [ ] **Step 1: Create useGuests hook**

Create `src/client/features/guests/hooks/useGuests.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../api/client";
import type { Guest } from "@shared/types/guest";

interface GuestListResponse {
  readonly ok: true;
  readonly data: readonly Guest[];
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
  };
}

interface GuestResponse {
  readonly ok: true;
  readonly data: Guest;
}

interface UseGuestsOptions {
  readonly tenantId: string;
  readonly q?: string;
  readonly tag?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly sort?: string;
  readonly order?: string;
}

export function useGuests(opts: UseGuestsOptions) {
  const [guests, setGuests] = useState<readonly Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { tenantId, q, tag, page = 1, limit = 50, sort, order } = opts;

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tag) params.set("tag", tag);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (sort) params.set("sort", sort);
      if (order) params.set("order", order);

      const qs = params.toString();
      const url = `/api/t/${tenantId}/guests${qs ? `?${qs}` : ""}`;
      const res = await api.get<GuestListResponse>(url);
      setGuests(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guests");
    } finally {
      setLoading(false);
    }
  }, [tenantId, q, tag, page, limit, sort, order]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  return { guests, total, loading, error, refetch: fetchGuests };
}

export async function createGuestApi(
  tenantId: string,
  data: { name: string; email?: string; phone?: string; notes?: string; tags?: string[] },
): Promise<Guest> {
  const res = await api.post<GuestResponse>(`/api/t/${tenantId}/guests`, data);
  return res.data;
}

export async function updateGuestApi(
  tenantId: string,
  guestId: string,
  data: { name?: string; email?: string; phone?: string; notes?: string; tags?: string[] },
): Promise<Guest> {
  const res = await api.patch<GuestResponse>(
    `/api/t/${tenantId}/guests/${guestId}`,
    data,
  );
  return res.data;
}

export async function deleteGuestApi(
  tenantId: string,
  guestId: string,
): Promise<void> {
  await api.delete(`/api/t/${tenantId}/guests/${guestId}`);
}
```

- [ ] **Step 2: Run type check**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/client/features/guests/hooks/useGuests.ts
git commit -m "feat: add useGuests data fetching hook (#84)"
```

---

### Task 7: Client Guest List + Form + Detail Components

**Files:**
- Create: `src/client/features/guests/components/GuestList.tsx`
- Create: `src/client/features/guests/components/GuestForm.tsx`
- Create: `src/client/features/guests/components/GuestDetail.tsx`
- Create: `src/client/features/guests/index.ts`

- [ ] **Step 1: Create GuestForm component**

Create `src/client/features/guests/components/GuestForm.tsx`:

```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@mattbutlerengineering/rialto";
import { createGuestSchema } from "@shared/schemas/guest";
import type { CreateGuestInput } from "@shared/schemas/guest";
import type { Guest } from "@shared/types/guest";

interface GuestFormProps {
  readonly guest?: Guest | undefined;
  readonly onSubmit: (data: CreateGuestInput) => void;
  readonly onCancel: () => void;
  readonly submitting?: boolean;
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-md, 16px)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-md, 16px)",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-sm, 10px)",
  justifyContent: "flex-end",
  marginTop: "var(--rialto-space-md, 16px)",
};

const buttonBase: React.CSSProperties = {
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-lg, 16px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  cursor: "pointer",
  border: "none",
};

const cancelStyle: React.CSSProperties = {
  ...buttonBase,
  background: "transparent",
  color: "var(--rialto-text-secondary, #a09a92)",
};

const submitStyle: React.CSSProperties = {
  ...buttonBase,
  background: "var(--rialto-accent, #c49a2a)",
  color: "var(--rialto-text-on-accent, #1a1918)",
};

export function GuestForm({ guest, onSubmit, onCancel, submitting }: GuestFormProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<CreateGuestInput>({
    resolver: zodResolver(createGuestSchema),
    defaultValues: {
      name: guest?.name ?? "",
      email: guest?.email ?? "",
      phone: guest?.phone ?? "",
      notes: guest?.notes ?? "",
      tags: guest?.tags ? [...guest.tags] : [],
    },
    mode: "onTouched",
  });

  return (
    <form style={formStyle} onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            label="Name"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
          />
        )}
      />
      <div style={rowStyle}>
        <div style={{ flex: 1 }}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                label="Email"
                type="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
              />
            )}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                label="Phone"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.phone?.message}
              />
            )}
          />
        </div>
      </div>
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <Input
            label="Notes"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.notes?.message}
          />
        )}
      />
      <div style={buttonRowStyle}>
        <button type="button" style={cancelStyle} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" style={submitStyle} disabled={submitting}>
          {guest ? "Update" : "Add Guest"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create GuestDetail component**

Create `src/client/features/guests/components/GuestDetail.tsx`:

```typescript
import { useState } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import type { Guest } from "@shared/types/guest";
import type { CreateGuestInput } from "@shared/schemas/guest";
import { GuestForm } from "./GuestForm";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

interface GuestDetailProps {
  readonly guest: Guest;
  readonly onUpdate: (data: CreateGuestInput) => Promise<void>;
  readonly onDelete: () => Promise<void>;
  readonly onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 100,
  display: "flex",
  justifyContent: "flex-end",
};

const drawerStyle: React.CSSProperties = {
  width: 420,
  maxWidth: "100vw",
  background: "var(--rialto-surface-elevated, #2a2725)",
  borderLeft: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  padding: "var(--rialto-space-xl, 20px)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-lg, 16px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-xl, 20px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const closeStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--rialto-text-secondary, #a09a92)",
  cursor: "pointer",
  fontSize: "var(--rialto-text-lg, 18px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const deleteStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(220,60,60,0.4)",
  color: "#dc3c3c",
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-lg, 16px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  cursor: "pointer",
  marginTop: "var(--rialto-space-lg, 16px)",
};

const statRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-xl, 20px)",
};

const statStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const statLabelStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  color: "var(--rialto-text-secondary, #a09a92)",
  textTransform: "uppercase" as const,
  letterSpacing: "var(--rialto-tracking-wide, 0.05em)",
};

const statValueStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-md, 16px)",
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const tagContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--rialto-space-xs, 4px)",
};

const tagStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  padding: "2px 8px",
  borderRadius: "var(--rialto-radius-pill, 999px)",
  background: "rgba(196,154,42,0.15)",
  color: "var(--rialto-accent, #c49a2a)",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  margin: "var(--rialto-space-sm, 10px) 0",
};

export function GuestDetail({ guest, onUpdate, onDelete, onClose }: GuestDetailProps) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpdate = async (data: CreateGuestInput) => {
    setSubmitting(true);
    try {
      await onUpdate(data);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${guest.name}?`)) return;
    setSubmitting(true);
    try {
      await onDelete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <motion.div
        style={ms(drawerStyle)}
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={headerStyle}>
          <h2 style={titleStyle}>{guest.name}</h2>
          <button style={closeStyle} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {guest.tags.length > 0 && (
          <div style={tagContainerStyle}>
            {guest.tags.map((t) => (
              <span key={t} style={tagStyle}>{t}</span>
            ))}
          </div>
        )}

        <div style={statRowStyle}>
          <div style={statStyle}>
            <span style={statLabelStyle}>Visits</span>
            <span style={statValueStyle}>{guest.visitCount}</span>
          </div>
          <div style={statStyle}>
            <span style={statLabelStyle}>Last Visit</span>
            <span style={statValueStyle}>
              {guest.lastVisitAt
                ? new Date(guest.lastVisitAt).toLocaleDateString()
                : "Never"}
            </span>
          </div>
        </div>

        <div style={dividerStyle} aria-hidden="true" />

        {editing ? (
          <GuestForm
            guest={guest}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitting={submitting}
          />
        ) : (
          <>
            <button
              style={{
                ...deleteStyle,
                borderColor: "var(--rialto-border, rgba(255,255,255,0.1))",
                color: "var(--rialto-text-primary, #e8e2d8)",
              }}
              onClick={() => setEditing(true)}
            >
              Edit Guest
            </button>
            <button style={deleteStyle} onClick={handleDelete} disabled={submitting}>
              Delete Guest
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Create GuestList component**

Create `src/client/features/guests/components/GuestList.tsx`:

```typescript
import { useState, useEffect } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { Input } from "@mattbutlerengineering/rialto";
import type { Guest } from "@shared/types/guest";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface GuestListProps {
  readonly guests: readonly Guest[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly loading: boolean;
  readonly search: string;
  readonly onSearchChange: (q: string) => void;
  readonly onPageChange: (page: number) => void;
  readonly onSelect: (guest: Guest) => void;
  readonly onAdd: () => void;
}

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-md, 16px)",
  alignItems: "center",
  marginBottom: "var(--rialto-space-lg, 16px)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 16px)",
  borderBottom: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  color: "var(--rialto-text-secondary, #a09a92)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  fontSize: "var(--rialto-text-xs, 12px)",
  textTransform: "uppercase" as const,
  letterSpacing: "var(--rialto-tracking-wide, 0.05em)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 16px)",
  borderBottom: "1px solid var(--rialto-border, rgba(255,255,255,0.06))",
  color: "var(--rialto-text-primary, #e8e2d8)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const rowStyle: React.CSSProperties = {
  cursor: "pointer",
};

const tagStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  padding: "2px 8px",
  borderRadius: "var(--rialto-radius-pill, 999px)",
  background: "rgba(196,154,42,0.15)",
  color: "var(--rialto-accent, #c49a2a)",
  marginRight: 4,
};

const addButtonStyle: React.CSSProperties = {
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-lg, 16px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  background: "var(--rialto-accent, #c49a2a)",
  color: "var(--rialto-text-on-accent, #1a1918)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const paginationStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "var(--rialto-space-md, 16px) 0",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  color: "var(--rialto-text-secondary, #a09a92)",
};

const pageButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  color: "var(--rialto-text-primary, #e8e2d8)",
  padding: "var(--rialto-space-xs, 4px) var(--rialto-space-sm, 10px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  cursor: "pointer",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "var(--rialto-space-2xl, 32px)",
  color: "var(--rialto-text-secondary, #a09a92)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-md, 16px)",
};

export function GuestList({
  guests,
  total,
  page,
  limit,
  loading,
  search,
  onSearchChange,
  onPageChange,
  onSelect,
  onAdd,
}: GuestListProps) {
  const [searchInput, setSearchInput] = useState(search);
  const totalPages = Math.ceil(total / limit);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  return (
    <div>
      <div style={toolbarStyle}>
        <div style={{ flex: 1 }}>
          <Input
            label="Search guests"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, email, or phone..."
          />
        </div>
        <button style={addButtonStyle} onClick={onAdd}>
          + Add Guest
        </button>
      </div>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : guests.length === 0 ? (
        <div style={emptyStyle}>
          {search ? "No guests match your search" : "No guests yet"}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.03 }}
        >
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Tags</th>
                <th style={thStyle}>Visits</th>
                <th style={thStyle}>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <motion.tr
                  key={guest.id}
                  variants={fadeUp}
                  style={ms(rowStyle)}
                  onClick={() => onSelect(guest)}
                >
                  <td style={tdStyle}>{guest.name}</td>
                  <td style={{ ...tdStyle, color: "var(--rialto-text-secondary, #a09a92)" }}>
                    {guest.email || "—"}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--rialto-text-secondary, #a09a92)" }}>
                    {guest.phone || "—"}
                  </td>
                  <td style={tdStyle}>
                    {guest.tags.map((t) => (
                      <span key={t} style={tagStyle}>{t}</span>
                    ))}
                  </td>
                  <td style={tdStyle}>{guest.visitCount}</td>
                  <td style={{ ...tdStyle, color: "var(--rialto-text-secondary, #a09a92)" }}>
                    {guest.lastVisitAt
                      ? new Date(guest.lastVisitAt).toLocaleDateString()
                      : "—"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {totalPages > 1 && (
        <div style={paginationStyle}>
          <span>
            {total} guest{total !== 1 ? "s" : ""} &middot; Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "var(--rialto-space-xs, 4px)" }}>
            <button
              style={pageButtonStyle}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </button>
            <button
              style={pageButtonStyle}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create barrel export**

Create `src/client/features/guests/index.ts`:

```typescript
export { GuestList } from "./components/GuestList";
export { GuestForm } from "./components/GuestForm";
export { GuestDetail } from "./components/GuestDetail";
export { useGuests, createGuestApi, updateGuestApi, deleteGuestApi } from "./hooks/useGuests";
```

- [ ] **Step 5: Run type check**

Run: `pnpm build`
Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/client/features/guests/
git commit -m "feat: add guest list, form, and detail components (#84)"
```

---

### Task 8: Guests Page + Routing

**Files:**
- Create: `src/client/pages/Guests.tsx`
- Modify: `src/client/App.tsx`
- Modify: `src/client/pages/Dashboard.tsx`

- [ ] **Step 1: Create Guests page**

Create `src/client/pages/Guests.tsx`:

```typescript
import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { useAuth } from "../hooks/useAuth";
import {
  GuestList,
  GuestDetail,
  GuestForm,
  useGuests,
  createGuestApi,
  updateGuestApi,
  deleteGuestApi,
} from "../features/guests";
import type { Guest } from "@shared/types/guest";
import type { CreateGuestInput } from "@shared/schemas/guest";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--rialto-surface, #1e1c1a)",
  padding: "var(--rialto-space-xl, 20px) var(--rialto-space-2xl, 32px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--rialto-space-xl, 20px)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-2xl, 24px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const backStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--rialto-text-secondary, #a09a92)",
  cursor: "pointer",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: React.CSSProperties = {
  background: "var(--rialto-surface-elevated, #2a2725)",
  borderRadius: "var(--rialto-radius-soft, 10px)",
  padding: "var(--rialto-space-xl, 20px)",
  width: 460,
  maxWidth: "90vw",
  maxHeight: "90vh",
  overflowY: "auto",
};

const modalTitleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-lg, 18px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
  marginBottom: "var(--rialto-space-lg, 16px)",
};

export function Guests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tenantId = user?.tenantId ?? "";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { guests, total, loading, refetch } = useGuests({
    tenantId,
    q: search || undefined,
    page,
    limit: 50,
  });

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const handleAdd = async (data: CreateGuestInput) => {
    setSubmitting(true);
    try {
      await createGuestApi(tenantId, data);
      setShowAddForm(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: CreateGuestInput) => {
    if (!selectedGuest) return;
    await updateGuestApi(tenantId, selectedGuest.id, data);
    refetch();
    setSelectedGuest(null);
  };

  const handleDelete = async () => {
    if (!selectedGuest) return;
    await deleteGuestApi(tenantId, selectedGuest.id);
    refetch();
    setSelectedGuest(null);
  };

  if (!tenantId) {
    navigate("/onboarding");
    return null;
  }

  return (
    <div style={pageStyle} data-theme="dark">
      <main id="main-content">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1 }}
        >
          <motion.div variants={fadeUp} style={headerStyle}>
            <h1 style={titleStyle}>Guests</h1>
            <button style={backStyle} onClick={() => navigate("/")}>
              &larr; Dashboard
            </button>
          </motion.div>

          <motion.div variants={fadeUp}>
            <GuestList
              guests={guests}
              total={total}
              page={page}
              limit={50}
              loading={loading}
              search={search}
              onSearchChange={handleSearchChange}
              onPageChange={setPage}
              onSelect={setSelectedGuest}
              onAdd={() => setShowAddForm(true)}
            />
          </motion.div>
        </motion.div>
      </main>

      <AnimatePresence>
        {selectedGuest && (
          <GuestDetail
            guest={selectedGuest}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelectedGuest(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            style={modalOverlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              style={modalStyle}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={modalTitleStyle}>Add Guest</h2>
              <GuestForm
                onSubmit={handleAdd}
                onCancel={() => setShowAddForm(false)}
                submitting={submitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

In `src/client/App.tsx`, add lazy import after FloorPlan (line 16):

```typescript
const Guests = lazy(() =>
  import("./pages/Guests").then((m) => ({ default: m.Guests })),
);
```

Add route before the Dashboard catch-all route (before the `path="/"` Route):

```typescript
<Route
  path="/guests"
  element={
    user?.tenantId ? (
      <Guests />
    ) : user ? (
      <Navigate to="/onboarding" />
    ) : (
      <Navigate to="/login" />
    )
  }
/>
```

- [ ] **Step 3: Wire up Dashboard nav link**

In `src/client/pages/Dashboard.tsx`, change the Guests nav item at line 22:

```typescript
// Before:
{ label: "Guests", active: false, path: null },
// After:
{ label: "Guests", active: false, path: "/guests" },
```

- [ ] **Step 4: Run type check**

Run: `pnpm build`
Expected: no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/Guests.tsx src/client/App.tsx src/client/pages/Dashboard.tsx
git commit -m "feat: add guests page with routing and dashboard nav (#84)"
```

---

### Task 9: Manual Verification + Final Commit

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: all tests pass (including new guest route tests)

- [ ] **Step 2: Run type check**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Start dev servers and test in browser**

Run: `npx wrangler dev --port 8788` (terminal 1) and `pnpm dev` (terminal 2)

Navigate to `http://localhost:5173`. Click "Guests" in the sidebar. Verify:
- Empty state shows "No guests yet"
- Click "+ Add Guest" → form opens in modal
- Fill name, email, phone → submit → guest appears in list
- Click guest row → detail drawer opens
- Edit guest → changes saved
- Delete guest → removed from list
- Type in search → list filters
- Pagination works if you add many guests

- [ ] **Step 4: Apply migration to production (if deploying)**

Run: `npx wrangler d1 execute eat-sheet-db --remote --file=src/server/db/migrations/004_guests.sql`

---

## Verification Checklist

- [ ] Migration creates `guests` table with all columns and indexes
- [ ] `schema.sql` matches migration
- [ ] Shared types and Zod schemas export correctly
- [ ] All 5 CRUD endpoints work with proper auth/permissions
- [ ] Paginated list with search and tag filter
- [ ] Route tests cover all endpoints, 401/403/404 cases
- [ ] Client page renders with search, pagination, add/edit/delete
- [ ] Dashboard sidebar links to `/guests`
- [ ] All existing tests still pass
- [ ] TypeScript builds clean
