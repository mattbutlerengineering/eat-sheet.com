-- Floor plans: one per area/floor per venue
CREATE TABLE floor_plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    canvas_width INTEGER NOT NULL DEFAULT 1200,
    canvas_height INTEGER NOT NULL DEFAULT 800,
    layout_data TEXT NOT NULL DEFAULT '{"tables":[],"sections":[]}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_floor_plans_tenant ON floor_plans(tenant_id);

-- Sections: named zones within a floor plan
CREATE TABLE floor_plan_sections (
    id TEXT PRIMARY KEY,
    floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#ffffff',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_fps_floor_plan ON floor_plan_sections(floor_plan_id);

-- Tables: individual dining tables
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
