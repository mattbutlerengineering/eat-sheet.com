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
