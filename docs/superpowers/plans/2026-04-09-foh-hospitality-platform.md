# FOH Hospitality Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild eat-sheet.com as a multi-tenant SaaS hospitality platform, Phase 1 covering all front-of-house operations.

**Architecture:** Hono API on Cloudflare Workers with D1 (SQLite) and R2. React 19 + Tailwind v4 client with json-render for server-driven UI. Shared DB with row-level tenant isolation via middleware. Permission-based RBAC.

**Tech Stack:** Hono, React 19, Tailwind v4, D1, R2, json-render, Zod, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-04-09-foh-hospitality-platform-design.md`

---

## File Structure

### Files to Delete (old app)

All files under `src/server/routes/` (old routes), `src/server/types.ts` (old types), `src/client/` (entire old client), `src/server/__tests__/` (old tests), `src/server/db/schema.sql` (old schema), `src/server/db/migrations/` (old migrations).

### Files to Create

**Shared:**
- `src/shared/permissions.ts` — Permission key constants used by both server and client

**Server — Core:**
- `src/server/types.ts` — Env binding, model interfaces, JWT payload types
- `src/server/db/schema.sql` — New multi-tenant schema
- `src/server/db/migrations/001_foundation.sql` — Foundation tables migration
- `src/server/db/seed.sql` — Default roles and permissions seed data
- `src/server/index.ts` — Hono app entry, route mounting (rewrite)

**Server — Middleware:**
- `src/server/middleware/auth.ts` — JWT validation, sets userId/tenantId
- `src/server/middleware/tenant.ts` — Tenant scope validation
- `src/server/middleware/permission.ts` — Permission-based access control

**Server — Routes:**
- `src/server/routes/auth.ts` — OAuth, JWT, tenant switching, /me
- `src/server/routes/tenants.ts` — Tenant CRUD
- `src/server/routes/members.ts` — Team management, invites
- `src/server/routes/roles.ts` — Role + permission CRUD
- `src/server/routes/floor-plans.ts` — Floor plans, sections, tables
- `src/server/routes/guests.ts` — Guest profiles
- `src/server/routes/service-periods.ts` — Shift definitions
- `src/server/routes/reservations.ts` — Reservation CRUD + lifecycle
- `src/server/routes/waitlist.ts` — Waitlist management
- `src/server/routes/assignments.ts` — Server assignments
- `src/server/routes/dashboard.ts` — Role-based dashboard specs

**Server — Services:**
- `src/server/services/reservation-service.ts` — Reservation state machine + validation
- `src/server/services/waitlist-service.ts` — Waitlist state machine + estimation
- `src/server/services/table-service.ts` — Table status management
- `src/server/services/availability-service.ts` — Slot availability calculations

**Server — Tests:**
- `src/server/__tests__/helpers/mock-db.ts` — Updated D1 mock
- `src/server/__tests__/helpers/auth.ts` — Updated JWT helper with tenantId
- `src/server/__tests__/middleware.test.ts` — Middleware tests
- `src/server/__tests__/tenants.test.ts`
- `src/server/__tests__/floor-plans.test.ts`
- `src/server/__tests__/guests.test.ts`
- `src/server/__tests__/service-periods.test.ts`
- `src/server/__tests__/reservations.test.ts`
- `src/server/__tests__/waitlist.test.ts`
- `src/server/__tests__/assignments.test.ts`
- `src/server/__tests__/dashboard.test.ts`

**Client:**
- `src/client/main.tsx` — App entry (rewrite)
- `src/client/App.tsx` — Router setup (rewrite)
- `src/client/index.css` — Tailwind base styles (rewrite)
- `src/client/hooks/useAuth.ts` — Auth state + JWT management
- `src/client/hooks/useTenant.ts` — Active tenant context
- `src/client/hooks/useSpec.ts` — Fetch + cache json-render specs
- `src/client/hooks/useApi.ts` — Tenant-scoped API fetch helper
- `src/client/components/Layout.tsx` — App shell with nav
- `src/client/components/Nav.tsx` — Navigation sidebar
- `src/client/components/ProtectedRoute.tsx` — Auth gate
- `src/client/pages/Login.tsx` — Static login page
- `src/client/pages/Dashboard.tsx` — json-render spec page
- `src/client/pages/FloorPlan.tsx` — json-render spec page
- `src/client/pages/Reservations.tsx` — json-render spec page
- `src/client/pages/Waitlist.tsx` — json-render spec page
- `src/client/pages/Guests.tsx` — json-render spec page
- `src/client/pages/Settings.tsx` — Hybrid settings page
- `src/client/catalog/index.ts` — json-render component catalog
- `src/client/catalog/schemas/common.ts` — Shared component schemas
- `src/client/catalog/schemas/tables.ts` — Table component schemas
- `src/client/catalog/schemas/reservations.ts` — Reservation component schemas
- `src/client/catalog/schemas/waitlist.ts` — Waitlist component schemas
- `src/client/catalog/schemas/guests.ts` — Guest component schemas
- `src/client/registry/index.ts` — json-render component registry
- `src/client/registry/components/StatCard.tsx`
- `src/client/registry/components/TableCard.tsx`
- `src/client/registry/components/ReservationRow.tsx`
- `src/client/registry/components/WaitlistEntry.tsx`
- `src/client/registry/components/GuestCard.tsx`
- `src/client/registry/components/FloorPlanGrid.tsx`
- `src/client/registry/components/StatusIndicator.tsx`
- `src/client/registry/components/DataTable.tsx`
- `src/client/registry/components/EmptyState.tsx`
- `src/client/registry/components/ActionButton.tsx`
- `src/client/registry/components/Badge.tsx`
- `src/client/registry/components/PageHeader.tsx`
- `src/client/registry/components/CardGrid.tsx`
- `src/client/types/index.ts` — Client-side type definitions

### Files to Modify

- `package.json` — Add zod, @json-render/react deps
- `wrangler.toml` — No changes needed (D1/R2 bindings stay)
- `vite.config.ts` — Update PWA manifest name/description only

---

## Task 1: Clean Slate — Remove Old App Code

**Files:**
- Delete: `src/server/routes/*.ts` (all 16 route files)
- Delete: `src/server/types.ts`
- Delete: `src/server/__tests__/` (all test files)
- Delete: `src/client/` (entire directory)
- Delete: `src/server/db/schema.sql`
- Delete: `src/server/db/migrations/` (all migration files)

- [ ] **Step 1: Delete old server routes**

```bash
rm src/server/routes/*.ts
```

- [ ] **Step 2: Delete old server types**

```bash
rm src/server/types.ts
```

- [ ] **Step 3: Delete old tests**

```bash
rm -rf src/server/__tests__
```

- [ ] **Step 4: Delete old client**

```bash
rm -rf src/client
```

- [ ] **Step 5: Delete old schema and migrations**

```bash
rm src/server/db/schema.sql
rm -rf src/server/db/migrations
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove old eat-sheet app code, preserve infrastructure"
```

---

## Task 2: Install New Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install zod and json-render**

```bash
npm install zod @json-render/react
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('zod'); console.log('zod ok')"
node -e "require('@json-render/react'); console.log('json-render ok')"
```

Expected: Both print "ok"

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add zod and @json-render/react dependencies"
```

---

## Task 3: Shared Permissions + New Types

**Files:**
- Create: `src/shared/permissions.ts`
- Create: `src/server/types.ts`

- [ ] **Step 1: Create shared permissions constants**

```typescript
// src/shared/permissions.ts

export const PERMISSIONS = {
  // Tenant
  TENANT_VIEW: 'tenant.view',
  TENANT_MANAGE: 'tenant.manage',

  // Floor & Tables
  FLOOR_VIEW: 'floor.view',
  FLOOR_MANAGE: 'floor.manage',
  TABLES_MANAGE: 'tables.manage',
  TABLES_UPDATE_STATUS: 'tables.update_status',

  // Guests
  GUESTS_VIEW: 'guests.view',
  GUESTS_CREATE: 'guests.create',
  GUESTS_UPDATE: 'guests.update',
  GUESTS_DELETE: 'guests.delete',

  // Shifts / Service Periods
  SHIFTS_VIEW: 'shifts.view',
  SHIFTS_MANAGE: 'shifts.manage',

  // Reservations
  RESERVATIONS_VIEW: 'reservations.view',
  RESERVATIONS_CREATE: 'reservations.create',
  RESERVATIONS_UPDATE: 'reservations.update',
  RESERVATIONS_DELETE: 'reservations.delete',

  // Waitlist
  WAITLIST_VIEW: 'waitlist.view',
  WAITLIST_CREATE: 'waitlist.create',
  WAITLIST_UPDATE: 'waitlist.update',
  WAITLIST_DELETE: 'waitlist.delete',
  WAITLIST_MANAGE: 'waitlist.manage',

  // Staff
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',

  // Reports
  REPORTS_VIEW: 'reports.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

// Default role → permission mappings (used in seed)
export const DEFAULT_ROLES = {
  owner: { name: 'Owner', description: 'Full access to everything', permissions: '*' as const },
  manager: {
    name: 'Manager',
    description: 'Manages floor, reservations, staff, and reports',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_MANAGE, PERMISSIONS.TABLES_MANAGE,
      PERMISSIONS.TABLES_UPDATE_STATUS, PERMISSIONS.GUESTS_VIEW, PERMISSIONS.GUESTS_CREATE,
      PERMISSIONS.GUESTS_UPDATE, PERMISSIONS.GUESTS_DELETE, PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.SHIFTS_MANAGE, PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.RESERVATIONS_CREATE,
      PERMISSIONS.RESERVATIONS_UPDATE, PERMISSIONS.RESERVATIONS_DELETE, PERMISSIONS.WAITLIST_VIEW,
      PERMISSIONS.WAITLIST_CREATE, PERMISSIONS.WAITLIST_UPDATE, PERMISSIONS.WAITLIST_DELETE,
      PERMISSIONS.WAITLIST_MANAGE, PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE,
      PERMISSIONS.REPORTS_VIEW, PERMISSIONS.FLOOR_VIEW,
    ],
  },
  host: {
    name: 'Host',
    description: 'Manages reservations, waitlist, and seating',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_VIEW, PERMISSIONS.TABLES_UPDATE_STATUS,
      PERMISSIONS.GUESTS_VIEW, PERMISSIONS.GUESTS_CREATE, PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.RESERVATIONS_CREATE, PERMISSIONS.RESERVATIONS_UPDATE,
      PERMISSIONS.WAITLIST_VIEW, PERMISSIONS.WAITLIST_CREATE, PERMISSIONS.WAITLIST_UPDATE,
      PERMISSIONS.WAITLIST_MANAGE, PERMISSIONS.STAFF_VIEW,
    ],
  },
  server: {
    name: 'Server',
    description: 'Views assigned section and guest info',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_VIEW, PERMISSIONS.GUESTS_VIEW,
      PERMISSIONS.SHIFTS_VIEW, PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.WAITLIST_VIEW,
      PERMISSIONS.STAFF_VIEW,
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to all data',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_VIEW, PERMISSIONS.GUESTS_VIEW,
      PERMISSIONS.SHIFTS_VIEW, PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.WAITLIST_VIEW,
      PERMISSIONS.STAFF_VIEW, PERMISSIONS.REPORTS_VIEW,
    ],
  },
} as const;
```

- [ ] **Step 2: Create new server types**

```typescript
// src/server/types.ts

export interface Env {
  readonly DB: D1Database;
  readonly JWT_SECRET: string;
  readonly PHOTOS: R2Bucket;
  readonly GOOGLE_OAUTH_CLIENT_ID: string;
  readonly GOOGLE_OAUTH_CLIENT_SECRET: string;
  readonly OAUTH_REDIRECT_BASE: string;
  readonly SENTRY_DSN: string;
}

export interface JwtPayload {
  readonly userId: string;
  readonly tenantId: string;
  readonly roleId: string;
  readonly permissions: string[];
  readonly exp: number;
}

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly settings: string | null;
  readonly created_at: string;
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly oauth_provider: string | null;
  readonly oauth_id: string | null;
  readonly created_at: string;
}

export interface TenantMember {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly role_id: string;
  readonly is_owner: number;
  readonly created_at: string;
}

export interface Role {
  readonly id: string;
  readonly tenant_id: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly is_system: number;
  readonly created_at: string;
}

export interface Permission {
  readonly id: string;
  readonly key: string;
  readonly category: string;
  readonly description: string | null;
}

export interface FloorPlan {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly is_active: number;
  readonly created_at: string;
}

export interface Section {
  readonly id: string;
  readonly floor_plan_id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly sort_order: number;
  readonly created_at: string;
}

export interface Table {
  readonly id: string;
  readonly floor_plan_id: string;
  readonly section_id: string | null;
  readonly tenant_id: string;
  readonly label: string;
  readonly min_capacity: number;
  readonly max_capacity: number;
  readonly is_combinable: number;
  readonly status: 'available' | 'occupied' | 'reserved' | 'blocked';
  readonly position_x: number | null;
  readonly position_y: number | null;
  readonly created_at: string;
}

export interface Guest {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly tags: string | null;
  readonly notes: string | null;
  readonly visit_count: number;
  readonly last_visit_at: string | null;
  readonly created_at: string;
}

export interface ServicePeriod {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly day_of_week: number;
  readonly start_time: string;
  readonly end_time: string;
  readonly max_reservations: number | null;
  readonly reservation_interval: number;
  readonly turn_time: number;
  readonly is_active: number;
  readonly created_at: string;
}

export interface Reservation {
  readonly id: string;
  readonly tenant_id: string;
  readonly guest_id: string;
  readonly table_id: string | null;
  readonly service_period_id: string | null;
  readonly party_size: number;
  readonly date: string;
  readonly time: string;
  readonly status: 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled';
  readonly notes: string | null;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string | null;
}

export interface WaitlistEntry {
  readonly id: string;
  readonly tenant_id: string;
  readonly guest_id: string | null;
  readonly guest_name: string;
  readonly party_size: number;
  readonly phone: string | null;
  readonly quoted_wait: number | null;
  readonly position: number;
  readonly status: 'waiting' | 'notified' | 'seated' | 'left' | 'cancelled';
  readonly notes: string | null;
  readonly checked_in_at: string;
  readonly seated_at: string | null;
  readonly created_at: string;
}

export interface ServerAssignment {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly section_id: string | null;
  readonly table_id: string | null;
  readonly service_period_id: string;
  readonly date: string;
  readonly created_at: string;
}

// API response envelope
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly meta?: { readonly total: number; readonly page: number; readonly limit: number };
}

// Hono app type with our bindings and variables
export interface AppVariables {
  userId: string;
  tenantId: string;
  roleId: string;
  permissions: string[];
  sentryReported: boolean;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/permissions.ts src/server/types.ts
git commit -m "feat: add shared permissions constants and new server types"
```

---

## Task 4: Database Schema + Seed Data

**Files:**
- Create: `src/server/db/schema.sql`
- Create: `src/server/db/migrations/001_foundation.sql`
- Create: `src/server/db/seed.sql`

- [ ] **Step 1: Create new schema**

```sql
-- src/server/db/schema.sql

-- Foundation tables
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  settings TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  oauth_provider TEXT,
  oauth_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  is_owner INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, user_id)
);

-- FOH tables
CREATE TABLE IF NOT EXISTS floor_plans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES sections(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  label TEXT NOT NULL,
  min_capacity INTEGER NOT NULL DEFAULT 1,
  max_capacity INTEGER NOT NULL DEFAULT 4,
  is_combinable INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'blocked')),
  position_x REAL,
  position_y REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tags TEXT,
  notes TEXT,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_visit_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_periods (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  max_reservations INTEGER,
  reservation_interval INTEGER NOT NULL DEFAULT 15,
  turn_time INTEGER NOT NULL DEFAULT 90,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  guest_id TEXT NOT NULL REFERENCES guests(id),
  table_id TEXT REFERENCES tables(id),
  service_period_id TEXT REFERENCES service_periods(id),
  party_size INTEGER NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'seated', 'completed', 'no_show', 'cancelled')),
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  guest_id TEXT REFERENCES guests(id),
  guest_name TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  phone TEXT,
  quoted_wait INTEGER,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting', 'notified', 'seated', 'left', 'cancelled')),
  notes TEXT,
  checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
  seated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS server_assignments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  section_id TEXT REFERENCES sections(id),
  table_id TEXT REFERENCES tables(id),
  service_period_id TEXT NOT NULL REFERENCES service_periods(id),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_tenant ON floor_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sections_floor_plan ON sections(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_sections_tenant ON sections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tables_floor_plan ON tables(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_tables_section ON tables(section_id);
CREATE INDEX IF NOT EXISTS idx_tables_tenant ON tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guests_tenant ON guests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_periods_tenant ON service_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant ON waitlist_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_server_assignments_tenant ON server_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_server_assignments_date ON server_assignments(tenant_id, date);
```

- [ ] **Step 2: Create migration file (same content as schema for first migration)**

```bash
mkdir -p src/server/db/migrations
cp src/server/db/schema.sql src/server/db/migrations/001_foundation.sql
```

- [ ] **Step 3: Create seed data**

```sql
-- src/server/db/seed.sql
-- Seed permissions
INSERT OR IGNORE INTO permissions (id, key, category, description) VALUES
  ('perm-01', 'tenant.view', 'tenant', 'View tenant details'),
  ('perm-02', 'tenant.manage', 'tenant', 'Update tenant settings'),
  ('perm-03', 'floor.view', 'floor', 'View floor plans'),
  ('perm-04', 'floor.manage', 'floor', 'Create/edit/delete floor plans and sections'),
  ('perm-05', 'tables.manage', 'tables', 'Create/edit/delete tables'),
  ('perm-06', 'tables.update_status', 'tables', 'Change table status'),
  ('perm-07', 'guests.view', 'guests', 'View guest profiles'),
  ('perm-08', 'guests.create', 'guests', 'Create guest profiles'),
  ('perm-09', 'guests.update', 'guests', 'Update guest profiles'),
  ('perm-10', 'guests.delete', 'guests', 'Delete guest profiles'),
  ('perm-11', 'shifts.view', 'shifts', 'View service periods'),
  ('perm-12', 'shifts.manage', 'shifts', 'Create/edit/delete service periods'),
  ('perm-13', 'reservations.view', 'reservations', 'View reservations'),
  ('perm-14', 'reservations.create', 'reservations', 'Create reservations'),
  ('perm-15', 'reservations.update', 'reservations', 'Update reservations and change status'),
  ('perm-16', 'reservations.delete', 'reservations', 'Delete reservations'),
  ('perm-17', 'waitlist.view', 'waitlist', 'View waitlist'),
  ('perm-18', 'waitlist.create', 'waitlist', 'Add to waitlist'),
  ('perm-19', 'waitlist.update', 'waitlist', 'Update waitlist entries'),
  ('perm-20', 'waitlist.delete', 'waitlist', 'Remove from waitlist'),
  ('perm-21', 'waitlist.manage', 'waitlist', 'Reorder waitlist'),
  ('perm-22', 'staff.view', 'staff', 'View staff and assignments'),
  ('perm-23', 'staff.manage', 'staff', 'Manage staff, roles, and assignments'),
  ('perm-24', 'reports.view', 'reports', 'View reports and analytics');

-- Seed system roles (tenant_id = NULL, is_system = 1)
INSERT OR IGNORE INTO roles (id, tenant_id, name, description, is_system) VALUES
  ('role-owner', NULL, 'Owner', 'Full access to everything', 1),
  ('role-manager', NULL, 'Manager', 'Manages floor, reservations, staff, and reports', 1),
  ('role-host', NULL, 'Host', 'Manages reservations, waitlist, and seating', 1),
  ('role-server', NULL, 'Server', 'Views assigned section and guest info', 1),
  ('role-viewer', NULL, 'Viewer', 'Read-only access to all data', 1);

-- Owner gets all permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role-owner', id FROM permissions;

-- Manager permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role-manager', id FROM permissions WHERE key IN (
    'tenant.view', 'floor.view', 'floor.manage', 'tables.manage', 'tables.update_status',
    'guests.view', 'guests.create', 'guests.update', 'guests.delete',
    'shifts.view', 'shifts.manage',
    'reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete',
    'waitlist.view', 'waitlist.create', 'waitlist.update', 'waitlist.delete', 'waitlist.manage',
    'staff.view', 'staff.manage', 'reports.view'
  );

-- Host permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role-host', id FROM permissions WHERE key IN (
    'tenant.view', 'floor.view', 'tables.update_status',
    'guests.view', 'guests.create', 'shifts.view',
    'reservations.view', 'reservations.create', 'reservations.update',
    'waitlist.view', 'waitlist.create', 'waitlist.update', 'waitlist.manage',
    'staff.view'
  );

-- Server permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role-server', id FROM permissions WHERE key IN (
    'tenant.view', 'floor.view', 'guests.view', 'shifts.view',
    'reservations.view', 'waitlist.view', 'staff.view'
  );

-- Viewer permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role-viewer', id FROM permissions WHERE key IN (
    'tenant.view', 'floor.view', 'guests.view', 'shifts.view',
    'reservations.view', 'waitlist.view', 'staff.view', 'reports.view'
  );
```

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema.sql src/server/db/migrations/001_foundation.sql src/server/db/seed.sql
git commit -m "feat: add multi-tenant schema, migration, and seed data"
```

---

## Task 5: Middleware — Auth, Tenant Scope, Permissions

**Files:**
- Create: `src/server/middleware/auth.ts`
- Create: `src/server/middleware/tenant.ts`
- Create: `src/server/middleware/permission.ts`
- Create: `src/server/__tests__/helpers/mock-db.ts`
- Create: `src/server/__tests__/helpers/auth.ts`
- Create: `src/server/__tests__/middleware.test.ts`

- [ ] **Step 1: Write middleware tests**

```typescript
// src/server/__tests__/middleware.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { requirePermission } from '../middleware/permission';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';
import { createMockDb } from './helpers/mock-db';

type AppEnv = { Bindings: Env; Variables: AppVariables };

function createTestApp() {
  const app = new Hono<AppEnv>();
  return app;
}

describe('authMiddleware', () => {
  it('rejects requests without Authorization header', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/*', authMiddleware());
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {}, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(401);
  });

  it('rejects invalid JWT', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/*', authMiddleware());
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    }, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(401);
  });

  it('sets userId and tenantId from valid JWT', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/*', authMiddleware());
    app.get('/test', (c) => {
      return c.json({ userId: c.get('userId'), tenantId: c.get('tenantId') });
    });

    const token = await makeToken();
    const res = await app.request('/test', {
      headers: authHeader(token),
    }, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('user-1');
    expect(body.tenantId).toBe('tenant-1');
  });
});

describe('tenantScope', () => {
  it('rejects when JWT tenantId does not match URL tenantId', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
    app.get('/api/t/:tenantId/test', (c) => c.json({ ok: true }));

    const token = await makeToken({ tenantId: 'tenant-1' });
    const res = await app.request('/api/t/tenant-OTHER/test', {
      headers: authHeader(token),
    }, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(403);
  });

  it('allows when JWT tenantId matches URL tenantId', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
    app.get('/api/t/:tenantId/test', (c) => c.json({ ok: true }));

    const token = await makeToken({ tenantId: 'tenant-1' });
    const res = await app.request('/api/t/tenant-1/test', {
      headers: authHeader(token),
    }, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(200);
  });
});

describe('requirePermission', () => {
  it('rejects when user lacks required permission', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
    app.get('/api/t/:tenantId/test', requirePermission('floor.manage'), (c) => c.json({ ok: true }));

    const token = await makeToken({ permissions: ['floor.view'] });
    const res = await app.request('/api/t/tenant-1/test', {
      headers: authHeader(token),
    }, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(403);
  });

  it('allows when user has required permission', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
    app.get('/api/t/:tenantId/test', requirePermission('floor.manage'), (c) => c.json({ ok: true }));

    const token = await makeToken({ permissions: ['floor.manage'] });
    const res = await app.request('/api/t/tenant-1/test', {
      headers: authHeader(token),
    }, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(200);
  });

  it('allows owner role (has all permissions via wildcard)', async () => {
    const app = createTestApp();
    const { db } = createMockDb();
    app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
    app.get('/api/t/:tenantId/test', requirePermission('floor.manage'), (c) => c.json({ ok: true }));

    const token = await makeToken({ permissions: ['*'] });
    const res = await app.request('/api/t/tenant-1/test', {
      headers: authHeader(token),
    }, { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/server/__tests__/middleware.test.ts
```

Expected: FAIL — middleware modules don't exist yet

- [ ] **Step 3: Create updated test helpers**

```typescript
// src/server/__tests__/helpers/mock-db.ts
interface MockStatement {
  bind: (...args: unknown[]) => MockStatement;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean }>;
}

interface MockDbConfig {
  first?: Record<string, unknown | null>;
  all?: Record<string, unknown[]>;
  run?: Record<string, { success: boolean }>;
}

export function createMockDb(config: MockDbConfig = {}) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];

  const createStatement = (sql: string): MockStatement => {
    const stmt: MockStatement = {
      bind(...args: unknown[]) {
        calls.push({ sql, params: args });
        return stmt;
      },
      async first<T = unknown>(): Promise<T | null> {
        const key = Object.keys(config.first ?? {}).find((k) => sql.includes(k));
        return (key ? config.first![key] : null) as T | null;
      },
      async all<T = unknown>(): Promise<{ results: T[] }> {
        const key = Object.keys(config.all ?? {}).find((k) => sql.includes(k));
        return { results: (key ? config.all![key] : []) as T[] };
      },
      async run(): Promise<{ success: boolean }> {
        const key = Object.keys(config.run ?? {}).find((k) => sql.includes(k));
        return key ? config.run![key]! : { success: true };
      },
    };
    return stmt;
  };

  const db = {
    prepare: (sql: string) => createStatement(sql),
    batch: async (stmts: MockStatement[]) => {
      const results = [];
      for (const stmt of stmts) {
        const allResult = await stmt.all();
        if (allResult.results.length > 0) {
          results.push({ ...allResult, success: true });
        } else {
          const firstResult = await stmt.first();
          results.push({ results: firstResult != null ? [firstResult] : [], success: true });
        }
      }
      return results;
    },
  };

  return { db: db as unknown as D1Database, calls };
}
```

```typescript
// src/server/__tests__/helpers/auth.ts
import { sign } from 'hono/jwt';

export const TEST_SECRET = 'test-jwt-secret-for-tests';

export const TEST_TENANT = {
  id: 'tenant-1',
  name: "Mario's Trattoria",
  slug: 'marios-trattoria',
  timezone: 'America/New_York',
  settings: null,
  created_at: '2026-01-01T00:00:00Z',
};

export const TEST_USER = {
  id: 'user-1',
  email: 'matt@example.com',
  name: 'Matt',
  oauth_provider: 'google',
  oauth_id: 'google-123',
  created_at: '2026-01-01T00:00:00Z',
};

export const TEST_USER_2 = {
  id: 'user-2',
  email: 'sarah@example.com',
  name: 'Sarah',
  oauth_provider: 'google',
  oauth_id: 'google-456',
  created_at: '2026-01-02T00:00:00Z',
};

export const TEST_MEMBER = {
  id: 'member-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  role_id: 'role-owner',
  is_owner: 1,
  created_at: '2026-01-01T00:00:00Z',
};

export async function makeToken(
  overrides: Partial<{
    userId: string;
    tenantId: string;
    roleId: string;
    permissions: string[];
  }> = {}
): Promise<string> {
  return sign(
    {
      userId: overrides.userId ?? TEST_USER.id,
      tenantId: overrides.tenantId ?? TEST_TENANT.id,
      roleId: overrides.roleId ?? 'role-owner',
      permissions: overrides.permissions ?? ['*'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_SECRET
  );
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
```

- [ ] **Step 4: Implement auth middleware**

```typescript
// src/server/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { Env, AppVariables, JwtPayload } from '../types';

export function authMiddleware() {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing or invalid authorization header' }, 401);
    }

    const token = header.slice(7);
    try {
      const payload = (await verify(token, c.env.JWT_SECRET)) as unknown as JwtPayload;
      c.set('userId', payload.userId);
      c.set('tenantId', payload.tenantId);
      c.set('roleId', payload.roleId);
      c.set('permissions', payload.permissions);
    } catch {
      return c.json({ success: false, error: 'Invalid or expired token' }, 401);
    }

    await next();
  });
}
```

- [ ] **Step 5: Implement tenant scope middleware**

```typescript
// src/server/middleware/tenant.ts
import { createMiddleware } from 'hono/factory';
import type { Env, AppVariables } from '../types';

export function tenantScope() {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
    const urlTenantId = c.req.param('tenantId');
    const jwtTenantId = c.get('tenantId');

    if (urlTenantId && urlTenantId !== jwtTenantId) {
      return c.json({ success: false, error: 'Tenant mismatch: you do not have access to this tenant' }, 403);
    }

    await next();
  });
}
```

- [ ] **Step 6: Implement permission middleware**

```typescript
// src/server/middleware/permission.ts
import { createMiddleware } from 'hono/factory';
import type { Env, AppVariables } from '../types';

export function requirePermission(required: string) {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
    const permissions = c.get('permissions');

    if (!permissions) {
      return c.json({ success: false, error: 'No permissions found' }, 403);
    }

    // Wildcard grants all permissions (owner role)
    if (permissions.includes('*')) {
      await next();
      return;
    }

    if (!permissions.includes(required)) {
      return c.json({ success: false, error: `Missing required permission: ${required}` }, 403);
    }

    await next();
  });
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test -- src/server/__tests__/middleware.test.ts
```

Expected: All 6 tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/server/middleware/ src/server/__tests__/
git commit -m "feat: add auth, tenant scope, and permission middleware with tests"
```

---

## Task 6: Server Entry Point + Health Route

**Files:**
- Modify: `src/server/index.ts`

- [ ] **Step 1: Rewrite server entry point**

```typescript
// src/server/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as Sentry from '@sentry/cloudflare';
import type { Env, AppVariables } from './types';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const app = new Hono<AppEnv>();

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin || origin.startsWith('http://localhost:')) {
        return origin ?? '';
      }
      return '';
    },
  })
);

// Capture 5xx responses for Sentry
app.use('/api/*', async (c, next) => {
  await next();
  if (c.res.status >= 500 && !c.get('sentryReported')) {
    Sentry.captureMessage(`${c.req.method} ${c.req.path} → ${c.res.status}`, {
      level: 'error',
      extra: { status: c.res.status },
    });
  }
});

// Routes will be added here as tasks are completed:
// app.route('/api/auth', authRoutes);
// app.route('/api/tenants', tenantRoutes);
// app.route('/api/t', tenantScopedRoutes);

app.get('/api/health', (c) => c.json({ success: true, data: { status: 'ok' } }));

app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.path}:`, err.stack ?? err.message);
  Sentry.captureException(err);
  c.set('sentryReported', true);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default Sentry.withSentry(
  (env: Env) => ({ dsn: env.SENTRY_DSN }),
  app
);
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds (no route imports yet, just health endpoint)

- [ ] **Step 3: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: rewrite server entry point with new type system"
```

---

## Task 7: Tenants Route

**Files:**
- Create: `src/server/routes/tenants.ts`
- Create: `src/server/__tests__/tenants.test.ts`

- [ ] **Step 1: Write tenant route tests**

```typescript
// src/server/__tests__/tenants.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { tenantRoutes } from '../routes/tenants';
import { makeToken, authHeader, TEST_SECRET, TEST_TENANT } from './helpers/auth';
import { createMockDb } from './helpers/mock-db';

type AppEnv = { Bindings: Env; Variables: AppVariables };

function createApp(dbConfig = {}) {
  const { db, calls } = createMockDb(dbConfig);
  const app = new Hono<AppEnv>();
  app.use('/api/*', authMiddleware());
  app.route('/api/tenants', tenantRoutes);
  const env = { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env;
  return { app, env, calls };
}

describe('POST /api/tenants', () => {
  it('creates a tenant and makes the user owner', async () => {
    const { app, env } = createApp({
      first: { 'SELECT id FROM tenants': null },
      run: { 'INSERT INTO tenants': { success: true }, 'INSERT INTO tenant_members': { success: true } },
    });
    const token = await makeToken();
    const res = await app.request('/api/tenants', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ name: "Mario's Trattoria", slug: 'marios-trattoria', timezone: 'America/New_York' }),
    }, env);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Mario's Trattoria");
  });

  it('rejects duplicate slug', async () => {
    const { app, env } = createApp({
      first: { 'SELECT id FROM tenants': { id: 'existing-tenant' } },
    });
    const token = await makeToken();
    const res = await app.request('/api/tenants', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ name: 'Duplicate', slug: 'marios-trattoria' }),
    }, env);
    expect(res.status).toBe(409);
  });

  it('rejects missing name', async () => {
    const { app, env } = createApp();
    const token = await makeToken();
    const res = await app.request('/api/tenants', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ slug: 'no-name' }),
    }, env);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/t/:tenantId', () => {
  it('returns tenant details', async () => {
    const { app, env } = createApp({
      first: { 'SELECT': TEST_TENANT },
    });
    // Need tenant-scoped app for this
    const scopedApp = new Hono<AppEnv>();
    scopedApp.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
    scopedApp.route('/api/t', tenantRoutes);

    const token = await makeToken();
    const res = await scopedApp.request('/api/t/tenant-1', {
      headers: authHeader(token),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Mario's Trattoria");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/server/__tests__/tenants.test.ts
```

Expected: FAIL — routes/tenants.ts doesn't exist

- [ ] **Step 3: Implement tenants route**

```typescript
// src/server/routes/tenants.ts
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  timezone: z.string().default('America/New_York'),
  settings: z.string().nullable().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  settings: z.string().nullable().optional(),
});

export const tenantRoutes = new Hono<AppEnv>();

// POST /api/tenants — create a new tenant
tenantRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  }
  const { name, slug, timezone, settings } = parsed.data;
  const userId = c.get('userId');
  const db = c.env.DB;

  // Check slug uniqueness
  const existing = await db.prepare('SELECT id FROM tenants WHERE slug = ?').bind(slug).first();
  if (existing) {
    return c.json({ success: false, error: 'Slug already taken' }, 409);
  }

  const tenantId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const memberId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  await db.prepare(
    'INSERT INTO tenants (id, name, slug, timezone, settings) VALUES (?, ?, ?, ?, ?)'
  ).bind(tenantId, name, slug, timezone, settings ?? null).run();

  // Creator becomes owner
  await db.prepare(
    'INSERT INTO tenant_members (id, tenant_id, user_id, role_id, is_owner) VALUES (?, ?, ?, ?, 1)'
  ).bind(memberId, tenantId, userId, 'role-owner').run();

  return c.json({
    success: true,
    data: { id: tenantId, name, slug, timezone, settings: settings ?? null },
  }, 201);
});

// GET /:tenantId — get tenant details
tenantRoutes.get('/:tenantId', requirePermission('tenant.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const tenant = await db.prepare(
    'SELECT id, name, slug, timezone, settings, created_at FROM tenants WHERE id = ?'
  ).bind(tenantId).first();

  if (!tenant) {
    return c.json({ success: false, error: 'Tenant not found' }, 404);
  }

  return c.json({ success: true, data: tenant });
});

// PATCH /:tenantId — update tenant
tenantRoutes.patch('/:tenantId', requirePermission('tenant.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;

  const body = await c.req.json().catch(() => null);
  const parsed = updateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  }

  const updates = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
  if (updates.timezone !== undefined) { setClauses.push('timezone = ?'); values.push(updates.timezone); }
  if (updates.settings !== undefined) { setClauses.push('settings = ?'); values.push(updates.settings); }

  if (setClauses.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  values.push(tenantId);
  await db.prepare(`UPDATE tenants SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();

  const updated = await db.prepare(
    'SELECT id, name, slug, timezone, settings, created_at FROM tenants WHERE id = ?'
  ).bind(tenantId).first();

  return c.json({ success: true, data: updated });
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/server/__tests__/tenants.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Wire up route in index.ts**

Add to `src/server/index.ts`:
```typescript
import { tenantRoutes } from './routes/tenants';
import { authMiddleware } from './middleware/auth';
import { tenantScope } from './middleware/tenant';

// After CORS middleware, before health route:
app.use('/api/tenants/*', authMiddleware());
app.route('/api/tenants', tenantRoutes);

// Tenant-scoped routes
app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
app.route('/api/t', tenantRoutes);
```

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/tenants.ts src/server/__tests__/tenants.test.ts src/server/index.ts
git commit -m "feat: add tenant CRUD routes with tests"
```

---

## Task 8: Guests Route

**Files:**
- Create: `src/server/routes/guests.ts`
- Create: `src/server/__tests__/guests.test.ts`

- [ ] **Step 1: Write guest route tests**

```typescript
// src/server/__tests__/guests.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { guestRoutes } from '../routes/guests';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';
import { createMockDb } from './helpers/mock-db';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const TEST_GUEST = {
  id: 'guest-1',
  tenant_id: 'tenant-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-0100',
  tags: '["vip"]',
  notes: 'Prefers booth',
  visit_count: 5,
  last_visit_at: '2026-03-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

function createApp(dbConfig = {}) {
  const { db, calls } = createMockDb(dbConfig);
  const app = new Hono<AppEnv>();
  app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
  app.route('/api/t/:tenantId/guests', guestRoutes);
  const env = { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env;
  return { app, env, calls };
}

describe('GET /api/t/:tenantId/guests', () => {
  it('lists guests for a tenant', async () => {
    const { app, env } = createApp({
      all: { 'SELECT': [TEST_GUEST] },
      first: { 'COUNT': { total: 1 } },
    });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/guests', {
      headers: authHeader(token),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('John Doe');
  });
});

describe('POST /api/t/:tenantId/guests', () => {
  it('creates a guest', async () => {
    const { app, env } = createApp({
      run: { 'INSERT INTO guests': { success: true } },
    });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/guests', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ name: 'Jane Smith', email: 'jane@example.com' }),
    }, env);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Jane Smith');
  });

  it('rejects missing name', async () => {
    const { app, env } = createApp();
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/guests', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ email: 'noname@example.com' }),
    }, env);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/t/:tenantId/guests/:id', () => {
  it('returns a single guest', async () => {
    const { app, env } = createApp({
      first: { 'SELECT': TEST_GUEST },
    });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/guests/guest-1', {
      headers: authHeader(token),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('John Doe');
  });

  it('returns 404 for unknown guest', async () => {
    const { app, env } = createApp({ first: {} });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/guests/unknown', {
      headers: authHeader(token),
    }, env);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/t/:tenantId/guests/:id', () => {
  it('updates a guest', async () => {
    const updatedGuest = { ...TEST_GUEST, name: 'John Updated' };
    const { app, env } = createApp({
      first: { 'SELECT': updatedGuest },
      run: { 'UPDATE guests': { success: true } },
    });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/guests/guest-1', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ name: 'John Updated' }),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('John Updated');
  });
});

describe('DELETE /api/t/:tenantId/guests/:id', () => {
  it('deletes a guest', async () => {
    const { app, env } = createApp({
      first: { 'SELECT': TEST_GUEST },
      run: { 'DELETE FROM guests': { success: true } },
    });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/guests/guest-1', {
      method: 'DELETE',
      headers: authHeader(token),
    }, env);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/server/__tests__/guests.test.ts
```

Expected: FAIL — routes/guests.ts doesn't exist

- [ ] **Step 3: Implement guests route**

```typescript
// src/server/routes/guests.ts
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const createGuestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  tags: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateGuestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  tags: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const guestRoutes = new Hono<AppEnv>();

// GET / — list guests
guestRoutes.get('/', requirePermission('guests.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') ?? '25', 10), 100);
  const offset = (page - 1) * limit;
  const search = c.req.query('search');
  const tag = c.req.query('tag');

  let where = 'WHERE tenant_id = ?';
  const params: unknown[] = [tenantId];

  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }
  if (tag) {
    where += ' AND tags LIKE ?';
    params.push(`%"${tag}"%`);
  }

  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM guests ${where}`)
    .bind(...params).first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const guests = await db.prepare(
    `SELECT * FROM guests ${where} ORDER BY name ASC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ success: true, data: guests.results, meta: { total, page, limit } });
});

// POST / — create guest
guestRoutes.post('/', requirePermission('guests.create'), async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  const parsed = createGuestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  }

  const { name, email, phone, tags, notes } = parsed.data;
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  await db.prepare(
    'INSERT INTO guests (id, tenant_id, name, email, phone, tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, tenantId, name, email ?? null, phone ?? null, tags ?? null, notes ?? null).run();

  return c.json({
    success: true,
    data: { id, tenant_id: tenantId, name, email: email ?? null, phone: phone ?? null, tags: tags ?? null, notes: notes ?? null, visit_count: 0, last_visit_at: null },
  }, 201);
});

// GET /:id — get single guest
guestRoutes.get('/:id', requirePermission('guests.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const guestId = c.req.param('id');
  const db = c.env.DB;

  const guest = await db.prepare(
    'SELECT * FROM guests WHERE id = ? AND tenant_id = ?'
  ).bind(guestId, tenantId).first();

  if (!guest) {
    return c.json({ success: false, error: 'Guest not found' }, 404);
  }

  return c.json({ success: true, data: guest });
});

// GET /:id/visits — guest visit history
guestRoutes.get('/:id/visits', requirePermission('guests.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const guestId = c.req.param('id');
  const db = c.env.DB;

  const visits = await db.prepare(
    'SELECT * FROM reservations WHERE guest_id = ? AND tenant_id = ? AND status IN (?, ?) ORDER BY date DESC'
  ).bind(guestId, tenantId, 'completed', 'seated').all();

  return c.json({ success: true, data: visits.results });
});

// PATCH /:id — update guest
guestRoutes.patch('/:id', requirePermission('guests.update'), async (c) => {
  const tenantId = c.get('tenantId');
  const guestId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  const parsed = updateGuestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  }

  const updates = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
  if (updates.email !== undefined) { setClauses.push('email = ?'); values.push(updates.email); }
  if (updates.phone !== undefined) { setClauses.push('phone = ?'); values.push(updates.phone); }
  if (updates.tags !== undefined) { setClauses.push('tags = ?'); values.push(updates.tags); }
  if (updates.notes !== undefined) { setClauses.push('notes = ?'); values.push(updates.notes); }

  if (setClauses.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  values.push(guestId, tenantId);
  await db.prepare(`UPDATE guests SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`).bind(...values).run();

  const updated = await db.prepare('SELECT * FROM guests WHERE id = ? AND tenant_id = ?').bind(guestId, tenantId).first();
  return c.json({ success: true, data: updated });
});

// DELETE /:id — delete guest
guestRoutes.delete('/:id', requirePermission('guests.delete'), async (c) => {
  const tenantId = c.get('tenantId');
  const guestId = c.req.param('id');
  const db = c.env.DB;

  const guest = await db.prepare('SELECT id FROM guests WHERE id = ? AND tenant_id = ?').bind(guestId, tenantId).first();
  if (!guest) {
    return c.json({ success: false, error: 'Guest not found' }, 404);
  }

  await db.prepare('DELETE FROM guests WHERE id = ? AND tenant_id = ?').bind(guestId, tenantId).run();
  return c.json({ success: true, data: { deleted: guestId } });
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/server/__tests__/guests.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Wire up route in index.ts**

Add to `src/server/index.ts` after tenant-scoped middleware:
```typescript
import { guestRoutes } from './routes/guests';
app.route('/api/t/:tenantId/guests', guestRoutes);
```

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/guests.ts src/server/__tests__/guests.test.ts src/server/index.ts
git commit -m "feat: add guest CRUD routes with search, tags, and visit history"
```

---

## Task 9: Floor Plans, Sections & Tables Routes

**Files:**
- Create: `src/server/routes/floor-plans.ts`
- Create: `src/server/__tests__/floor-plans.test.ts`

- [ ] **Step 1: Write floor plan route tests**

```typescript
// src/server/__tests__/floor-plans.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { floorPlanRoutes } from '../routes/floor-plans';
import { makeToken, authHeader, TEST_SECRET } from './helpers/auth';
import { createMockDb } from './helpers/mock-db';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const TEST_FLOOR_PLAN = {
  id: 'fp-1', tenant_id: 'tenant-1', name: 'Main Floor', is_active: 1, created_at: '2026-01-01T00:00:00Z',
};

const TEST_TABLE = {
  id: 'table-1', floor_plan_id: 'fp-1', section_id: null, tenant_id: 'tenant-1',
  label: 'T1', min_capacity: 2, max_capacity: 4, is_combinable: 0,
  status: 'available', position_x: 10, position_y: 20, created_at: '2026-01-01T00:00:00Z',
};

function createApp(dbConfig = {}) {
  const { db, calls } = createMockDb(dbConfig);
  const app = new Hono<AppEnv>();
  app.use('/api/t/:tenantId/*', authMiddleware(), tenantScope());
  app.route('/api/t/:tenantId/floor-plans', floorPlanRoutes);
  const env = { DB: db, JWT_SECRET: TEST_SECRET } as unknown as Env;
  return { app, env, calls };
}

describe('GET /api/t/:tenantId/floor-plans', () => {
  it('lists floor plans', async () => {
    const { app, env } = createApp({ all: { 'SELECT': [TEST_FLOOR_PLAN] } });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/floor-plans', { headers: authHeader(token) }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/t/:tenantId/floor-plans', () => {
  it('creates a floor plan', async () => {
    const { app, env } = createApp({ run: { 'INSERT': { success: true } } });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/floor-plans', {
      method: 'POST', headers: authHeader(token),
      body: JSON.stringify({ name: 'Event Layout' }),
    }, env);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Event Layout');
  });
});

describe('POST /api/t/:tenantId/floor-plans/:id/tables', () => {
  it('adds a table to a floor plan', async () => {
    const { app, env } = createApp({
      first: { 'SELECT': TEST_FLOOR_PLAN },
      run: { 'INSERT': { success: true } },
    });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/floor-plans/fp-1/tables', {
      method: 'POST', headers: authHeader(token),
      body: JSON.stringify({ label: 'T2', min_capacity: 1, max_capacity: 6 }),
    }, env);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.label).toBe('T2');
  });
});

describe('PATCH /api/t/:tenantId/tables/:id/status', () => {
  it('updates table status', async () => {
    const updatedTable = { ...TEST_TABLE, status: 'occupied' };
    const { app, env } = createApp({
      first: { 'SELECT': updatedTable },
      run: { 'UPDATE': { success: true } },
    });
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/tables/table-1/status', {
      method: 'PATCH', headers: authHeader(token),
      body: JSON.stringify({ status: 'occupied' }),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('occupied');
  });

  it('rejects invalid status', async () => {
    const { app, env } = createApp();
    const token = await makeToken();
    const res = await app.request('/api/t/tenant-1/tables/table-1/status', {
      method: 'PATCH', headers: authHeader(token),
      body: JSON.stringify({ status: 'invalid' }),
    }, env);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/server/__tests__/floor-plans.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement floor plans route**

```typescript
// src/server/routes/floor-plans.ts
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppVariables } from '../types';
import { requirePermission } from '../middleware/permission';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const createFloorPlanSchema = z.object({ name: z.string().min(1).max(100) });
const updateFloorPlanSchema = z.object({ name: z.string().min(1).max(100).optional(), is_active: z.number().int().min(0).max(1).optional() });
const createSectionSchema = z.object({ name: z.string().min(1).max(100), sort_order: z.number().int().default(0) });
const updateSectionSchema = z.object({ name: z.string().min(1).max(100).optional(), sort_order: z.number().int().optional() });
const createTableSchema = z.object({
  label: z.string().min(1).max(50),
  section_id: z.string().nullable().optional(),
  min_capacity: z.number().int().min(1).default(1),
  max_capacity: z.number().int().min(1).default(4),
  is_combinable: z.number().int().min(0).max(1).default(0),
  position_x: z.number().nullable().optional(),
  position_y: z.number().nullable().optional(),
});
const updateTableSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  section_id: z.string().nullable().optional(),
  min_capacity: z.number().int().min(1).optional(),
  max_capacity: z.number().int().min(1).optional(),
  is_combinable: z.number().int().min(0).max(1).optional(),
  position_x: z.number().nullable().optional(),
  position_y: z.number().nullable().optional(),
});
const tableStatusSchema = z.object({ status: z.enum(['available', 'occupied', 'reserved', 'blocked']) });

export const floorPlanRoutes = new Hono<AppEnv>();

// --- Floor Plans ---

floorPlanRoutes.get('/', requirePermission('floor.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const plans = await c.env.DB.prepare('SELECT * FROM floor_plans WHERE tenant_id = ? ORDER BY created_at DESC').bind(tenantId).all();
  return c.json({ success: true, data: plans.results });
});

floorPlanRoutes.post('/', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => null);
  const parsed = createFloorPlanSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await c.env.DB.prepare('INSERT INTO floor_plans (id, tenant_id, name) VALUES (?, ?, ?)').bind(id, tenantId, parsed.data.name).run();
  return c.json({ success: true, data: { id, tenant_id: tenantId, name: parsed.data.name, is_active: 0 } }, 201);
});

floorPlanRoutes.get('/:id', requirePermission('floor.view'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;
  const plan = await db.prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first();
  if (!plan) return c.json({ success: false, error: 'Floor plan not found' }, 404);
  const sections = await db.prepare('SELECT * FROM sections WHERE floor_plan_id = ? AND tenant_id = ? ORDER BY sort_order').bind(id, tenantId).all();
  const tables = await db.prepare('SELECT * FROM tables WHERE floor_plan_id = ? AND tenant_id = ?').bind(id, tenantId).all();
  return c.json({ success: true, data: { ...plan, sections: sections.results, tables: tables.results } });
});

floorPlanRoutes.patch('/:id', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  const parsed = updateFloorPlanSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);

  const updates = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
  if (updates.is_active !== undefined) {
    // If setting active, deactivate all others first
    if (updates.is_active === 1) {
      await db.prepare('UPDATE floor_plans SET is_active = 0 WHERE tenant_id = ?').bind(tenantId).run();
    }
    setClauses.push('is_active = ?');
    values.push(updates.is_active);
  }
  if (setClauses.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400);

  values.push(id, tenantId);
  await db.prepare(`UPDATE floor_plans SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`).bind(...values).run();
  const updated = await db.prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first();
  return c.json({ success: true, data: updated });
});

floorPlanRoutes.delete('/:id', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;
  const plan = await db.prepare('SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first<{ is_active: number }>();
  if (!plan) return c.json({ success: false, error: 'Floor plan not found' }, 404);
  if (plan.is_active) return c.json({ success: false, error: 'Cannot delete active floor plan' }, 400);
  await db.prepare('DELETE FROM floor_plans WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
  return c.json({ success: true, data: { deleted: id } });
});

// --- Sections ---

floorPlanRoutes.post('/:id/sections', requirePermission('floor.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const floorPlanId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await db.prepare('INSERT INTO sections (id, floor_plan_id, tenant_id, name, sort_order) VALUES (?, ?, ?, ?, ?)')
    .bind(id, floorPlanId, tenantId, parsed.data.name, parsed.data.sort_order).run();
  return c.json({ success: true, data: { id, floor_plan_id: floorPlanId, tenant_id: tenantId, name: parsed.data.name, sort_order: parsed.data.sort_order } }, 201);
});

// --- Tables ---

floorPlanRoutes.post('/:id/tables', requirePermission('tables.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const floorPlanId = c.req.param('id');
  const db = c.env.DB;

  const plan = await db.prepare('SELECT id FROM floor_plans WHERE id = ? AND tenant_id = ?').bind(floorPlanId, tenantId).first();
  if (!plan) return c.json({ success: false, error: 'Floor plan not found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = createTableSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);

  const { label, section_id, min_capacity, max_capacity, is_combinable, position_x, position_y } = parsed.data;
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  await db.prepare(
    'INSERT INTO tables (id, floor_plan_id, section_id, tenant_id, label, min_capacity, max_capacity, is_combinable, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, floorPlanId, section_id ?? null, tenantId, label, min_capacity, max_capacity, is_combinable, position_x ?? null, position_y ?? null).run();

  return c.json({
    success: true,
    data: { id, floor_plan_id: floorPlanId, section_id: section_id ?? null, tenant_id: tenantId, label, min_capacity, max_capacity, is_combinable, status: 'available', position_x: position_x ?? null, position_y: position_y ?? null },
  }, 201);
});

// Table routes mounted at a higher level need separate Hono instances
// These are additional routes that sit alongside the floor-plan routes

// PATCH /tables/:id — update table
floorPlanRoutes.patch('/../../tables/:id', requirePermission('tables.manage'), async (c) => {
  // This won't work — we need a separate tableRoutes. See below.
});

// We'll export table-specific routes separately
export const tableRoutes = new Hono<AppEnv>();

tableRoutes.patch('/:id', requirePermission('tables.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  const parsed = updateTableSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);

  const updates = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  if (updates.label !== undefined) { setClauses.push('label = ?'); values.push(updates.label); }
  if (updates.section_id !== undefined) { setClauses.push('section_id = ?'); values.push(updates.section_id); }
  if (updates.min_capacity !== undefined) { setClauses.push('min_capacity = ?'); values.push(updates.min_capacity); }
  if (updates.max_capacity !== undefined) { setClauses.push('max_capacity = ?'); values.push(updates.max_capacity); }
  if (updates.is_combinable !== undefined) { setClauses.push('is_combinable = ?'); values.push(updates.is_combinable); }
  if (updates.position_x !== undefined) { setClauses.push('position_x = ?'); values.push(updates.position_x); }
  if (updates.position_y !== undefined) { setClauses.push('position_y = ?'); values.push(updates.position_y); }

  if (setClauses.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400);

  values.push(id, tenantId);
  await db.prepare(`UPDATE tables SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`).bind(...values).run();
  const updated = await db.prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first();
  return c.json({ success: true, data: updated });
});

tableRoutes.patch('/:id/status', requirePermission('tables.update_status'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  const parsed = tableStatusSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);

  await db.prepare('UPDATE tables SET status = ? WHERE id = ? AND tenant_id = ?').bind(parsed.data.status, id, tenantId).run();
  const updated = await db.prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first();
  return c.json({ success: true, data: updated });
});

tableRoutes.delete('/:id', requirePermission('tables.manage'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const db = c.env.DB;
  await db.prepare('DELETE FROM tables WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
  return c.json({ success: true, data: { deleted: id } });
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/server/__tests__/floor-plans.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Wire up routes in index.ts**

```typescript
import { floorPlanRoutes, tableRoutes } from './routes/floor-plans';
app.route('/api/t/:tenantId/floor-plans', floorPlanRoutes);
app.route('/api/t/:tenantId/tables', tableRoutes);
```

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/floor-plans.ts src/server/__tests__/floor-plans.test.ts src/server/index.ts
git commit -m "feat: add floor plans, sections, and tables routes with tests"
```

---

## Task 10: Service Periods Route

**Files:**
- Create: `src/server/routes/service-periods.ts`
- Create: `src/server/__tests__/service-periods.test.ts`

This follows the same CRUD pattern as guests. For brevity, the key implementation details:

- [ ] **Step 1: Write service period tests**

Tests for: GET list, POST create (with day_of_week 0-6, start/end time validation), GET /today (filters by current day), GET /current, PATCH update, DELETE.

Test file: `src/server/__tests__/service-periods.test.ts`

Use the same test helper pattern as guests. Key test data:

```typescript
const TEST_SERVICE_PERIOD = {
  id: 'sp-1', tenant_id: 'tenant-1', name: 'Dinner', day_of_week: 3,
  start_time: '17:00', end_time: '22:00', max_reservations: null,
  reservation_interval: 15, turn_time: 90, is_active: 1, created_at: '2026-01-01T00:00:00Z',
};
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/server/__tests__/service-periods.test.ts
```

- [ ] **Step 3: Implement service periods route**

Zod schemas for create/update. CRUD endpoints. `/today` filters by current day_of_week. `/current` filters by day_of_week AND current time between start_time and end_time.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/server/__tests__/service-periods.test.ts
```

- [ ] **Step 5: Wire up and commit**

```bash
git add src/server/routes/service-periods.ts src/server/__tests__/service-periods.test.ts src/server/index.ts
git commit -m "feat: add service periods routes with today/current endpoints"
```

---

## Task 11: Reservation Service (Business Logic)

**Files:**
- Create: `src/server/services/reservation-service.ts`
- Create: `src/server/services/table-service.ts`
- Create: `src/server/services/availability-service.ts`

These services encapsulate the state machine logic and validation rules.

- [ ] **Step 1: Implement table service**

```typescript
// src/server/services/table-service.ts
import type { Table } from '../types';

const VALID_TRANSITIONS: Record<string, string[]> = {
  available: ['reserved', 'occupied', 'blocked'],
  reserved: ['occupied', 'available'],
  occupied: ['available'],
  blocked: ['available'],
};

export function canTransitionTable(currentStatus: string, newStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

export async function updateTableStatus(
  db: D1Database,
  tableId: string,
  tenantId: string,
  newStatus: Table['status']
): Promise<void> {
  await db.prepare('UPDATE tables SET status = ? WHERE id = ? AND tenant_id = ?')
    .bind(newStatus, tableId, tenantId).run();
}
```

- [ ] **Step 2: Implement availability service**

```typescript
// src/server/services/availability-service.ts

export interface TimeSlot {
  readonly time: string;
  readonly available_tables: number;
}

export async function getAvailableSlots(
  db: D1Database,
  tenantId: string,
  date: string,
  partySize: number
): Promise<TimeSlot[]> {
  // Get day of week from date
  const dayOfWeek = new Date(date).getDay();

  // Find active service periods for this day
  const periods = await db.prepare(
    'SELECT * FROM service_periods WHERE tenant_id = ? AND day_of_week = ? AND is_active = 1'
  ).bind(tenantId, dayOfWeek).all<{ start_time: string; end_time: string; reservation_interval: number; turn_time: number }>();

  // Get tables that fit party size
  const tables = await db.prepare(
    'SELECT id FROM tables t JOIN floor_plans fp ON t.floor_plan_id = fp.id WHERE t.tenant_id = ? AND fp.is_active = 1 AND t.max_capacity >= ? AND t.min_capacity <= ? AND t.status != ?'
  ).bind(tenantId, partySize, partySize, 'blocked').all<{ id: string }>();

  const tableIds = tables.results.map((t) => t.id);
  if (tableIds.length === 0) return [];

  // Get existing reservations for this date
  const reservations = await db.prepare(
    'SELECT table_id, time, status FROM reservations WHERE tenant_id = ? AND date = ? AND status IN (?, ?)'
  ).bind(tenantId, date, 'confirmed', 'seated').all<{ table_id: string | null; time: string; status: string }>();

  const slots: TimeSlot[] = [];

  for (const period of periods.results) {
    const interval = period.reservation_interval;
    const turnTime = period.turn_time;
    let [startH, startM] = period.start_time.split(':').map(Number);
    const [endH, endM] = period.end_time.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    let currentMinutes = startH * 60 + startM;
    while (currentMinutes < endMinutes - turnTime) {
      const timeStr = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;

      // Count tables available at this time (not booked within turn_time window)
      let availableCount = 0;
      for (const tableId of tableIds) {
        const isBooked = reservations.results.some((r) => {
          if (r.table_id !== tableId) return false;
          const [rH, rM] = r.time.split(':').map(Number);
          const rMinutes = rH * 60 + rM;
          return Math.abs(rMinutes - currentMinutes) < turnTime;
        });
        if (!isBooked) availableCount++;
      }

      slots.push({ time: timeStr, available_tables: availableCount });
      currentMinutes += interval;
    }
  }

  return slots;
}
```

- [ ] **Step 3: Implement reservation service**

```typescript
// src/server/services/reservation-service.ts

const VALID_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed', 'no_show'],
};

export function canTransitionReservation(currentStatus: string, newStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

export async function transitionReservation(
  db: D1Database,
  tenantId: string,
  reservationId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const reservation = await db.prepare(
    'SELECT * FROM reservations WHERE id = ? AND tenant_id = ?'
  ).bind(reservationId, tenantId).first<{
    id: string; status: string; table_id: string | null; guest_id: string;
  }>();

  if (!reservation) return { success: false, error: 'Reservation not found' };
  if (!canTransitionReservation(reservation.status, newStatus)) {
    return { success: false, error: `Cannot transition from ${reservation.status} to ${newStatus}` };
  }

  // Update reservation status
  await db.prepare(
    "UPDATE reservations SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?"
  ).bind(newStatus, reservationId, tenantId).run();

  // Side effects
  if (newStatus === 'seated' && reservation.table_id) {
    await db.prepare('UPDATE tables SET status = ? WHERE id = ? AND tenant_id = ?')
      .bind('occupied', reservation.table_id, tenantId).run();
    await db.prepare('UPDATE guests SET visit_count = visit_count + 1 WHERE id = ? AND tenant_id = ?')
      .bind(reservation.guest_id, tenantId).run();
  }

  if ((newStatus === 'completed' || newStatus === 'no_show' || newStatus === 'cancelled') && reservation.table_id) {
    await db.prepare('UPDATE tables SET status = ? WHERE id = ? AND tenant_id = ?')
      .bind('available', reservation.table_id, tenantId).run();
  }

  if (newStatus === 'completed') {
    await db.prepare("UPDATE guests SET last_visit_at = datetime('now') WHERE id = ? AND tenant_id = ?")
      .bind(reservation.guest_id, tenantId).run();
  }

  return { success: true };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/server/services/
git commit -m "feat: add reservation, table, and availability business logic services"
```

---

## Task 12: Reservations Route

**Files:**
- Create: `src/server/routes/reservations.ts`
- Create: `src/server/__tests__/reservations.test.ts`

- [ ] **Step 1: Write reservation route tests**

Tests for: GET list (filter by date, status), POST create (with validation), GET /:id, PATCH /:id, PATCH /:id/status (state transitions + side effects), DELETE, GET /availability.

- [ ] **Step 2: Run tests to verify fail, implement, run tests to verify pass**

Key implementation: Uses `reservation-service.ts` for state transitions and `availability-service.ts` for slot calculations. Zod validation on create/update. Party size vs table capacity check on create.

- [ ] **Step 3: Wire up and commit**

```bash
git add src/server/routes/reservations.ts src/server/__tests__/reservations.test.ts src/server/index.ts
git commit -m "feat: add reservations routes with lifecycle state machine"
```

---

## Task 13: Waitlist Route + Service

**Files:**
- Create: `src/server/services/waitlist-service.ts`
- Create: `src/server/routes/waitlist.ts`
- Create: `src/server/__tests__/waitlist.test.ts`

- [ ] **Step 1: Implement waitlist service**

Wait estimate algorithm, position management (rebalancing on removal), state transitions (waiting → notified → seated, with left/cancelled exits).

- [ ] **Step 2: Write waitlist route tests**

Tests for: GET list (ordered by position), POST (auto-position, wait estimate), PATCH /:id, PATCH /:id/status (transitions), DELETE, POST /reorder, GET /estimate.

- [ ] **Step 3: Implement, verify tests pass**

- [ ] **Step 4: Wire up and commit**

```bash
git add src/server/services/waitlist-service.ts src/server/routes/waitlist.ts src/server/__tests__/waitlist.test.ts src/server/index.ts
git commit -m "feat: add waitlist routes with position management and wait estimation"
```

---

## Task 14: Server Assignments Route

**Files:**
- Create: `src/server/routes/assignments.ts`
- Create: `src/server/__tests__/assignments.test.ts`

- [ ] **Step 1: Write tests, implement, verify**

Standard CRUD + GET /today. Validates that the user being assigned is a tenant member. Links to sections and service periods.

- [ ] **Step 2: Wire up and commit**

```bash
git add src/server/routes/assignments.ts src/server/__tests__/assignments.test.ts src/server/index.ts
git commit -m "feat: add server assignment routes"
```

---

## Task 15: Members + Roles Routes

**Files:**
- Create: `src/server/routes/members.ts`
- Create: `src/server/routes/roles.ts`

- [ ] **Step 1: Implement members route**

GET list, POST invite (by email), PATCH (change role), DELETE (remove from tenant). Cannot remove the last owner.

- [ ] **Step 2: Implement roles route**

GET list (system + custom), POST create custom, PATCH update custom, DELETE custom (reject if members still assigned). Cannot modify system roles.

- [ ] **Step 3: Write tests, verify, commit**

```bash
git add src/server/routes/members.ts src/server/routes/roles.ts src/server/__tests__/members.test.ts src/server/__tests__/roles.test.ts src/server/index.ts
git commit -m "feat: add members and roles management routes"
```

---

## Task 16: Auth Route (OAuth + JWT + Tenant Switching)

**Files:**
- Create: `src/server/routes/auth.ts`
- Create: `src/server/__tests__/auth.test.ts`

- [ ] **Step 1: Implement auth route**

- `POST /auth/google` — initiates OAuth (redirect URL generation via arctic)
- `GET /auth/google/callback` — exchanges code for tokens, creates/finds user, issues JWT
- `POST /auth/refresh` — re-signs JWT with fresh expiry
- `GET /auth/me` — returns user profile + list of tenant memberships with roles
- `POST /auth/switch-tenant` — validates user is member of target tenant, issues new JWT with that tenantId + role permissions

Key difference from old auth: JWT now contains `userId`, `tenantId`, `roleId`, `permissions[]` instead of `member_id`.

- [ ] **Step 2: Write tests, verify, commit**

```bash
git add src/server/routes/auth.ts src/server/__tests__/auth.test.ts src/server/index.ts
git commit -m "feat: add auth routes with OAuth, JWT, and tenant switching"
```

---

## Task 17: Dashboard Route (json-render specs)

**Files:**
- Create: `src/server/routes/dashboard.ts`
- Create: `src/server/__tests__/dashboard.test.ts`

- [ ] **Step 1: Implement dashboard route**

`GET /api/t/:tenantId/dashboard` — returns a json-render spec based on user's role. Queries live data (reservation counts, waitlist length, table statuses, upcoming reservations) and embeds it as component props in the spec.

```typescript
// src/server/routes/dashboard.ts
import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';

type AppEnv = { Bindings: Env; Variables: AppVariables };

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const roleId = c.get('roleId');
  const db = c.env.DB;

  // Fetch dashboard data
  const today = new Date().toISOString().split('T')[0];

  const [reservationCount, waitlistCount, tableStats] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM reservations WHERE tenant_id = ? AND date = ? AND status IN (?, ?)')
      .bind(tenantId, today, 'confirmed', 'seated').first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM waitlist_entries WHERE tenant_id = ? AND status = ?")
      .bind(tenantId, 'waiting').first<{ count: number }>(),
    db.prepare("SELECT status, COUNT(*) as count FROM tables t JOIN floor_plans fp ON t.floor_plan_id = fp.id WHERE t.tenant_id = ? AND fp.is_active = 1 GROUP BY status")
      .bind(tenantId).all<{ status: string; count: number }>(),
  ]);

  const tableStatusMap: Record<string, number> = {};
  for (const row of tableStats.results) {
    tableStatusMap[row.status] = row.count;
  }

  // Build json-render spec based on role
  const spec = buildDashboardSpec(roleId, {
    reservationsToday: reservationCount?.count ?? 0,
    waitlistLength: waitlistCount?.count ?? 0,
    tables: tableStatusMap,
  });

  return c.json({ success: true, data: spec });
});

interface DashboardData {
  readonly reservationsToday: number;
  readonly waitlistLength: number;
  readonly tables: Record<string, number>;
}

function buildDashboardSpec(roleId: string, data: DashboardData) {
  const elements: Record<string, object> = {};
  const children: string[] = [];

  // Header — all roles see this
  elements['header'] = {
    type: 'PageHeader',
    props: { title: 'Dashboard', subtitle: `Today's overview` },
  };
  children.push('header');

  // Stats row — all roles
  elements['stats-grid'] = {
    type: 'CardGrid',
    props: { columns: 3 },
    children: ['stat-reservations', 'stat-waitlist', 'stat-tables'],
  };
  elements['stat-reservations'] = {
    type: 'StatCard',
    props: { label: 'Reservations Today', value: data.reservationsToday, icon: 'calendar' },
  };
  elements['stat-waitlist'] = {
    type: 'StatCard',
    props: { label: 'On Waitlist', value: data.waitlistLength, icon: 'clock' },
  };
  elements['stat-tables'] = {
    type: 'StatCard',
    props: {
      label: 'Tables Available',
      value: data.tables['available'] ?? 0,
      total: Object.values(data.tables).reduce((a, b) => a + b, 0),
      icon: 'layout',
    },
  };
  children.push('stats-grid');

  return { root: 'root', elements: { root: { type: 'PageHeader', children }, ...elements } };
}
```

- [ ] **Step 2: Write tests, verify, commit**

```bash
git add src/server/routes/dashboard.ts src/server/__tests__/dashboard.test.ts src/server/index.ts
git commit -m "feat: add role-based dashboard route returning json-render specs"
```

---

## Task 18: Final Server Wiring + Build Verification

**Files:**
- Modify: `src/server/index.ts` (final version with all routes)

- [ ] **Step 1: Ensure all routes are mounted in index.ts**

Verify imports and route mounting for: auth, tenants, members, roles, floor-plans, tables, guests, service-periods, reservations, waitlist, assignments, dashboard.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: wire up all FOH routes in server entry point"
```

---

## Task 19: Client Foundation — Hooks, Types, App Shell

**Files:**
- Create: `src/client/main.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/index.css`
- Create: `src/client/types/index.ts`
- Create: `src/client/hooks/useAuth.ts`
- Create: `src/client/hooks/useTenant.ts`
- Create: `src/client/hooks/useApi.ts`
- Create: `src/client/hooks/useSpec.ts`
- Create: `src/client/components/Layout.tsx`
- Create: `src/client/components/Nav.tsx`
- Create: `src/client/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create client types**

Re-export shared permissions. Define client-side types for API responses, auth state, tenant context.

- [ ] **Step 2: Create hooks**

- `useAuth` — stores JWT in localStorage, provides login/logout/isAuthenticated, decodes JWT for user info
- `useTenant` — derives active tenantId from JWT, provides switchTenant function
- `useApi` — wrapper around fetch that adds auth headers and tenant-scoped base URL
- `useSpec` — calls useApi to fetch a json-render spec, caches it, returns { spec, loading, error }

- [ ] **Step 3: Create app shell**

- `Layout.tsx` — sidebar nav + main content area
- `Nav.tsx` — links to Dashboard, Floor Plan, Reservations, Waitlist, Guests, Settings
- `ProtectedRoute.tsx` — redirects to /login if not authenticated
- `App.tsx` — React Router setup with all page routes wrapped in ProtectedRoute
- `main.tsx` — React 19 root render with App
- `index.css` — Tailwind v4 import

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/client/
git commit -m "feat: add client foundation — hooks, types, app shell, routing"
```

---

## Task 20: json-render Catalog + Registry

**Files:**
- Create: `src/client/catalog/index.ts`
- Create: `src/client/catalog/schemas/common.ts`
- Create: `src/client/catalog/schemas/tables.ts`
- Create: `src/client/catalog/schemas/reservations.ts`
- Create: `src/client/catalog/schemas/waitlist.ts`
- Create: `src/client/catalog/schemas/guests.ts`
- Create: `src/client/registry/index.ts`
- Create: `src/client/registry/components/*.tsx` (all registry components)

- [ ] **Step 1: Define component catalog schemas**

Zod schemas for each component type: StatCard, TableCard, ReservationRow, WaitlistEntry, GuestCard, FloorPlanGrid, StatusIndicator, DataTable, EmptyState, ActionButton, Badge, PageHeader, CardGrid.

- [ ] **Step 2: Create catalog index**

Use `defineCatalog()` to register all components with their schemas.

- [ ] **Step 3: Implement registry components**

React + Tailwind implementations for each cataloged component. Each is a focused, single-responsibility component.

- [ ] **Step 4: Create registry index**

Use `defineRegistry()` to map catalog → React components.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/client/catalog/ src/client/registry/
git commit -m "feat: add json-render component catalog and registry"
```

---

## Task 21: Client Pages (json-render Spec Pages)

**Files:**
- Create: `src/client/pages/Login.tsx`
- Create: `src/client/pages/Dashboard.tsx`
- Create: `src/client/pages/FloorPlan.tsx`
- Create: `src/client/pages/Reservations.tsx`
- Create: `src/client/pages/Waitlist.tsx`
- Create: `src/client/pages/Guests.tsx`
- Create: `src/client/pages/Settings.tsx`

- [ ] **Step 1: Create Login page (static React)**

Google OAuth login button, redirects to /api/auth/google.

- [ ] **Step 2: Create spec-driven pages**

Dashboard, FloorPlan, Reservations, Waitlist, Guests — all follow the same pattern:

```tsx
export default function Dashboard() {
  const { tenantId } = useTenant();
  const { spec, loading, error } = useSpec(`/api/t/${tenantId}/dashboard`);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} />;
  return <Renderer registry={fohRegistry} spec={spec} />;
}
```

- [ ] **Step 3: Create Settings page (hybrid)**

Tenant info, team management, role management. Uses direct API calls, not json-render.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/
git commit -m "feat: add all client pages — login, spec-driven views, settings"
```

---

## Task 22: PWA Manifest Update + Final Build

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Update PWA manifest**

Change `name` to "Hospitality Platform", `short_name` to "Hospitality", `description` to "Restaurant front-of-house management".

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "chore: update PWA manifest for hospitality platform"
```

---

## Task 23: E2E Smoke Test

**Files:**
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write basic E2E smoke test**

```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('http://localhost:8788/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.status).toBe('ok');
});

test('unauthenticated request returns 401', async ({ request }) => {
  const res = await request.get('http://localhost:8788/api/t/tenant-1/guests');
  expect(res.status()).toBe(401);
});

test('login page loads', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await expect(page.locator('body')).toBeVisible();
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: add E2E smoke tests for health, auth gate, and login page"
```

---

## Checkpoint: Review

At this point, the full FOH Phase 1 is complete:
- Multi-tenant foundation (tenants, users, roles, permissions)
- All 6 FOH resources with CRUD APIs and tests
- Business logic services (reservation lifecycle, waitlist, table status, availability)
- Middleware chain (auth → tenant scope → permission check)
- json-render catalog + registry + spec-driven pages
- Client app shell with routing and hooks
- E2E smoke tests

Run final verification:

```bash
npm test && npm run build
```
