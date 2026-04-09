-- Multi-tenant hospitality platform schema
-- D1 SQLite on Cloudflare Workers
-- Foreign keys enforced; every business table has tenant_id for row-level isolation

PRAGMA foreign_keys = ON;

-- ============================================================
-- Foundation
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name     TEXT NOT NULL,
  slug     TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  settings TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  oauth_provider TEXT NOT NULL,
  oauth_id       TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_system   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  key         TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    TEXT NOT NULL REFERENCES roles(id),
  is_owner   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, user_id)
);

-- ============================================================
-- FOH — Floor plans & seating
-- ============================================================

CREATE TABLE IF NOT EXISTS floor_plans (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sections (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tables (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  section_id    TEXT REFERENCES sections(id),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  min_capacity  INTEGER NOT NULL DEFAULT 1,
  max_capacity  INTEGER NOT NULL DEFAULT 4,
  is_combinable INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'occupied', 'reserved', 'blocked')),
  position_x    REAL,
  position_y    REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOH — Guests
-- ============================================================

CREATE TABLE IF NOT EXISTS guests (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  tags          TEXT,
  notes         TEXT,
  visit_count   INTEGER NOT NULL DEFAULT 0,
  last_visit_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOH — Service periods & reservations
-- ============================================================

CREATE TABLE IF NOT EXISTS service_periods (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id            TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  day_of_week          INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time           TEXT NOT NULL,
  end_time             TEXT NOT NULL,
  max_reservations     INTEGER,
  reservation_interval INTEGER NOT NULL DEFAULT 15,
  turn_time            INTEGER NOT NULL DEFAULT 90,
  is_active            INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id          TEXT NOT NULL REFERENCES guests(id),
  table_id          TEXT REFERENCES tables(id),
  service_period_id TEXT REFERENCES service_periods(id),
  party_size        INTEGER NOT NULL,
  date              TEXT NOT NULL,
  time              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed', 'seated', 'completed', 'no_show', 'cancelled')),
  notes             TEXT,
  created_by        TEXT NOT NULL REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOH — Waitlist
-- ============================================================

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id     TEXT REFERENCES guests(id),
  guest_name   TEXT NOT NULL,
  party_size   INTEGER NOT NULL,
  phone        TEXT,
  quoted_wait  INTEGER,
  position     INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting', 'notified', 'seated', 'left', 'cancelled')),
  notes        TEXT,
  checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
  seated_at    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOH — Server assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS server_assignments (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES users(id),
  section_id        TEXT REFERENCES sections(id),
  table_id          TEXT REFERENCES tables(id),
  service_period_id TEXT NOT NULL REFERENCES service_periods(id),
  date              TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Indexes
-- ============================================================

-- tenant_members
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id  ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id    ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_role_id    ON tenant_members(role_id);

-- floor_plans
CREATE INDEX IF NOT EXISTS idx_floor_plans_tenant_id     ON floor_plans(tenant_id);

-- sections
CREATE INDEX IF NOT EXISTS idx_sections_floor_plan_id    ON sections(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_sections_tenant_id        ON sections(tenant_id);

-- tables
CREATE INDEX IF NOT EXISTS idx_tables_floor_plan_id      ON tables(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_tables_section_id         ON tables(section_id);
CREATE INDEX IF NOT EXISTS idx_tables_tenant_id          ON tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tables_tenant_status      ON tables(tenant_id, status);

-- guests
CREATE INDEX IF NOT EXISTS idx_guests_tenant_id          ON guests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guests_tenant_email       ON guests(tenant_id, email);

-- service_periods
CREATE INDEX IF NOT EXISTS idx_service_periods_tenant_id ON service_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_periods_tenant_day ON service_periods(tenant_id, day_of_week);

-- reservations
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_id        ON reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_id         ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id         ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_service_period_id ON reservations(service_period_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date      ON reservations(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date_status ON reservations(tenant_id, date, status);

-- waitlist_entries
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_id        ON waitlist_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_guest_id         ON waitlist_entries(guest_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_status    ON waitlist_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_position  ON waitlist_entries(tenant_id, position);

-- server_assignments
CREATE INDEX IF NOT EXISTS idx_server_assignments_tenant_id         ON server_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_server_assignments_user_id           ON server_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_server_assignments_section_id        ON server_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_server_assignments_table_id          ON server_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_server_assignments_service_period_id ON server_assignments(service_period_id);
CREATE INDEX IF NOT EXISTS idx_server_assignments_tenant_date       ON server_assignments(tenant_id, date);
