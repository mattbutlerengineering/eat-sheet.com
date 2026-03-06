ALTER TABLE members ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE members ADD COLUMN email TEXT;
CREATE INDEX idx_members_google_id ON members(google_id);
