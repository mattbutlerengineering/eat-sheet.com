CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(family_id, name)
);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  cuisine TEXT,
  address TEXT,
  photo_url TEXT,
  created_by TEXT NOT NULL REFERENCES members(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  overall_score INTEGER NOT NULL CHECK(overall_score BETWEEN 1 AND 10),
  food_score INTEGER CHECK(food_score BETWEEN 1 AND 10),
  service_score INTEGER CHECK(service_score BETWEEN 1 AND 10),
  ambiance_score INTEGER CHECK(ambiance_score BETWEEN 1 AND 10),
  value_score INTEGER CHECK(value_score BETWEEN 1 AND 10),
  notes TEXT,
  visited_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(restaurant_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_family ON restaurants(family_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_member ON reviews(member_id);
