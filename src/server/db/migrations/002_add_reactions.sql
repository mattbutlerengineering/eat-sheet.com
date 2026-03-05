CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(review_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_review ON reactions(review_id);
