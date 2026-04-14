INSERT OR IGNORE INTO roles (id, tenant_id, name, permissions, is_system) VALUES
    ('role_owner',   NULL, 'Owner',   '["*"]', 1),
    ('role_manager', NULL, 'Manager', '["venues:read","venues:write","floor_plans:read","floor_plans:write","reservations:read","reservations:write","waitlist:read","waitlist:write","guests:read","guests:write","service_periods:read","service_periods:write","assignments:read","assignments:write","dashboard:read"]', 1),
    ('role_host',    NULL, 'Host',    '["venues:read","floor_plans:read","reservations:read","reservations:write","waitlist:read","waitlist:write","guests:read","guests:write","service_periods:read","assignments:read","dashboard:read"]', 1),
    ('role_server',  NULL, 'Server',  '["venues:read","floor_plans:read","reservations:read","waitlist:read","guests:read","service_periods:read","assignments:read","dashboard:read"]', 1),
    ('role_viewer',  NULL, 'Viewer',  '["venues:read","floor_plans:read","reservations:read","waitlist:read","guests:read","dashboard:read"]', 1);
