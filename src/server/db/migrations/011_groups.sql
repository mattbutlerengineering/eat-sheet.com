-- Migration 011: Replace single-family model with multi-group system
-- Data ownership moves to users (via created_by/member_id).
-- Groups are visibility lenses — users see data from all peers sharing any group.

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES members(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  group_id TEXT NOT NULL REFERENCES groups(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  is_admin INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_member ON group_members(member_id);

-- Data migration: copy each family into a group, preserving invite codes
INSERT INTO groups (id, name, invite_code, created_by, created_at)
SELECT
  f.id,
  f.name,
  f.invite_code,
  (SELECT m.id FROM members m WHERE m.family_id = f.id AND m.is_admin = 1 LIMIT 1),
  f.created_at
FROM families f
WHERE EXISTS (SELECT 1 FROM members m WHERE m.family_id = f.id AND m.is_admin = 1);

-- Copy member→family relationships into group_members
INSERT INTO group_members (group_id, member_id, is_admin, joined_at)
SELECT
  m.family_id,
  m.id,
  m.is_admin,
  m.created_at
FROM members m
WHERE EXISTS (SELECT 1 FROM groups g WHERE g.id = m.family_id);
