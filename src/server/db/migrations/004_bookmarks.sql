-- Migration 004: Add bookmarks table for "Want to Try" feature
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_member ON bookmarks(member_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_restaurant ON bookmarks(restaurant_id);
