CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('fine_dining', 'casual', 'bar', 'cafe')),
    cuisines TEXT NOT NULL DEFAULT '[]',
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'US',
    timezone TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE venue_themes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id),
    accent TEXT NOT NULL,
    accent_hover TEXT NOT NULL,
    surface TEXT,
    surface_elevated TEXT,
    text_primary TEXT,
    source TEXT NOT NULL CHECK (source IN ('extracted', 'manual')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id),
    name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tenant_members (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role_id TEXT NOT NULL REFERENCES roles(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, user_id)
);

-- Floor plans: one per area/floor per venue
CREATE TABLE floor_plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    canvas_width INTEGER NOT NULL DEFAULT 1200,
    canvas_height INTEGER NOT NULL DEFAULT 800,
    layout_data TEXT NOT NULL DEFAULT '{"tables":[],"sections":[],"walls":[]}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_floor_plans_tenant ON floor_plans(tenant_id);

CREATE TABLE floor_plan_sections (
    id TEXT PRIMARY KEY,
    floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#ffffff',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_fps_floor_plan ON floor_plan_sections(floor_plan_id);

CREATE TABLE floor_plan_tables (
    id TEXT PRIMARY KEY,
    floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
    section_id TEXT REFERENCES floor_plan_sections(id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    shape TEXT NOT NULL CHECK (shape IN ('circle', 'square', 'rectangle')),
    min_capacity INTEGER NOT NULL DEFAULT 1,
    max_capacity INTEGER NOT NULL DEFAULT 4,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_fpt_floor_plan ON floor_plan_tables(floor_plan_id);
