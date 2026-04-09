-- Multi-tenant hospitality platform seed data
-- Idempotent: uses INSERT OR IGNORE throughout

PRAGMA foreign_keys = ON;

-- ============================================================
-- Permissions (24 total, stable IDs perm-01 through perm-24)
-- ============================================================

INSERT OR IGNORE INTO permissions (id, key, category, description) VALUES
  ('perm-01', 'tenant.view',           'tenant',       'View tenant settings and details'),
  ('perm-02', 'tenant.manage',         'tenant',       'Manage tenant configuration and settings'),
  ('perm-03', 'floor.view',            'floor',        'View floor plans and sections'),
  ('perm-04', 'floor.manage',          'floor',        'Create and edit floor plans and sections'),
  ('perm-05', 'tables.manage',         'tables',       'Create, edit, and delete tables'),
  ('perm-06', 'tables.update_status',  'tables',       'Update table availability status'),
  ('perm-07', 'guests.view',           'guests',       'View guest profiles and history'),
  ('perm-08', 'guests.create',         'guests',       'Create new guest profiles'),
  ('perm-09', 'guests.update',         'guests',       'Edit existing guest profiles'),
  ('perm-10', 'guests.delete',         'guests',       'Delete guest profiles'),
  ('perm-11', 'shifts.view',           'shifts',       'View server assignments and shifts'),
  ('perm-12', 'shifts.manage',         'shifts',       'Create and manage server assignments'),
  ('perm-13', 'reservations.view',     'reservations', 'View reservations'),
  ('perm-14', 'reservations.create',   'reservations', 'Create new reservations'),
  ('perm-15', 'reservations.update',   'reservations', 'Edit and update existing reservations'),
  ('perm-16', 'reservations.delete',   'reservations', 'Cancel and delete reservations'),
  ('perm-17', 'waitlist.view',         'waitlist',     'View waitlist entries'),
  ('perm-18', 'waitlist.create',       'waitlist',     'Add entries to the waitlist'),
  ('perm-19', 'waitlist.update',       'waitlist',     'Update waitlist entry details'),
  ('perm-20', 'waitlist.delete',       'waitlist',     'Remove entries from the waitlist'),
  ('perm-21', 'waitlist.manage',       'waitlist',     'Manage waitlist positions and notifications'),
  ('perm-22', 'staff.view',            'staff',        'View staff members and assignments'),
  ('perm-23', 'staff.manage',          'staff',        'Add, edit, and remove staff members'),
  ('perm-24', 'reports.view',          'reports',      'View operational reports and analytics');

-- ============================================================
-- System roles (tenant_id = NULL, is_system = 1)
-- ============================================================

INSERT OR IGNORE INTO roles (id, tenant_id, name, description, is_system) VALUES
  ('role-owner',   NULL, 'Owner',   'Full access to all tenant features and settings', 1),
  ('role-manager', NULL, 'Manager', 'Full operational access excluding tenant configuration', 1),
  ('role-host',    NULL, 'Host',    'Front-of-house operations: reservations, waitlist, tables, guests', 1),
  ('role-server',  NULL, 'Server',  'View-only access for floor, guests, shifts, and reservations', 1),
  ('role-viewer',  NULL, 'Viewer',  'Read-only access to all view-level permissions', 1);

-- ============================================================
-- Role permissions
-- ============================================================

-- Owner: ALL 24 permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-owner', 'perm-01'),
  ('role-owner', 'perm-02'),
  ('role-owner', 'perm-03'),
  ('role-owner', 'perm-04'),
  ('role-owner', 'perm-05'),
  ('role-owner', 'perm-06'),
  ('role-owner', 'perm-07'),
  ('role-owner', 'perm-08'),
  ('role-owner', 'perm-09'),
  ('role-owner', 'perm-10'),
  ('role-owner', 'perm-11'),
  ('role-owner', 'perm-12'),
  ('role-owner', 'perm-13'),
  ('role-owner', 'perm-14'),
  ('role-owner', 'perm-15'),
  ('role-owner', 'perm-16'),
  ('role-owner', 'perm-17'),
  ('role-owner', 'perm-18'),
  ('role-owner', 'perm-19'),
  ('role-owner', 'perm-20'),
  ('role-owner', 'perm-21'),
  ('role-owner', 'perm-22'),
  ('role-owner', 'perm-23'),
  ('role-owner', 'perm-24');

-- Manager: all except tenant.manage (perm-02)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-manager', 'perm-01'),
  ('role-manager', 'perm-03'),
  ('role-manager', 'perm-04'),
  ('role-manager', 'perm-05'),
  ('role-manager', 'perm-06'),
  ('role-manager', 'perm-07'),
  ('role-manager', 'perm-08'),
  ('role-manager', 'perm-09'),
  ('role-manager', 'perm-10'),
  ('role-manager', 'perm-11'),
  ('role-manager', 'perm-12'),
  ('role-manager', 'perm-13'),
  ('role-manager', 'perm-14'),
  ('role-manager', 'perm-15'),
  ('role-manager', 'perm-16'),
  ('role-manager', 'perm-17'),
  ('role-manager', 'perm-18'),
  ('role-manager', 'perm-19'),
  ('role-manager', 'perm-20'),
  ('role-manager', 'perm-21'),
  ('role-manager', 'perm-22'),
  ('role-manager', 'perm-23'),
  ('role-manager', 'perm-24');

-- Host: tenant.view, floor.view, tables.update_status, guests.view/create,
--       shifts.view, reservations.view/create/update,
--       waitlist.view/create/update/manage, staff.view
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-host', 'perm-01'),  -- tenant.view
  ('role-host', 'perm-03'),  -- floor.view
  ('role-host', 'perm-06'),  -- tables.update_status
  ('role-host', 'perm-07'),  -- guests.view
  ('role-host', 'perm-08'),  -- guests.create
  ('role-host', 'perm-11'),  -- shifts.view
  ('role-host', 'perm-13'),  -- reservations.view
  ('role-host', 'perm-14'),  -- reservations.create
  ('role-host', 'perm-15'),  -- reservations.update
  ('role-host', 'perm-17'),  -- waitlist.view
  ('role-host', 'perm-18'),  -- waitlist.create
  ('role-host', 'perm-19'),  -- waitlist.update
  ('role-host', 'perm-21'),  -- waitlist.manage
  ('role-host', 'perm-22');  -- staff.view

-- Server: tenant.view, floor.view, guests.view, shifts.view,
--         reservations.view, waitlist.view, staff.view
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-server', 'perm-01'),  -- tenant.view
  ('role-server', 'perm-03'),  -- floor.view
  ('role-server', 'perm-07'),  -- guests.view
  ('role-server', 'perm-11'),  -- shifts.view
  ('role-server', 'perm-13'),  -- reservations.view
  ('role-server', 'perm-17'),  -- waitlist.view
  ('role-server', 'perm-22');  -- staff.view

-- Viewer: all *.view permissions + reports.view
-- tenant.view, floor.view, guests.view, shifts.view,
-- reservations.view, waitlist.view, staff.view, reports.view
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-viewer', 'perm-01'),  -- tenant.view
  ('role-viewer', 'perm-03'),  -- floor.view
  ('role-viewer', 'perm-07'),  -- guests.view
  ('role-viewer', 'perm-11'),  -- shifts.view
  ('role-viewer', 'perm-13'),  -- reservations.view
  ('role-viewer', 'perm-17'),  -- waitlist.view
  ('role-viewer', 'perm-22'),  -- staff.view
  ('role-viewer', 'perm-24');  -- reports.view
