-- Migration 003: Add review_photos table for multi-photo support
CREATE TABLE IF NOT EXISTS review_photos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_photos_review ON review_photos(review_id);

-- Migrate existing photo_url data from reviews table
INSERT INTO review_photos (review_id, photo_url, sort_order)
SELECT id, photo_url, 0 FROM reviews WHERE photo_url IS NOT NULL AND photo_url != '';
