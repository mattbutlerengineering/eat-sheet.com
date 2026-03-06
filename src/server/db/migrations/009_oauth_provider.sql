ALTER TABLE members ADD COLUMN oauth_provider TEXT;
ALTER TABLE members ADD COLUMN oauth_id TEXT;

UPDATE members SET oauth_provider = 'google', oauth_id = google_id WHERE google_id IS NOT NULL;

CREATE UNIQUE INDEX idx_members_oauth ON members(oauth_provider, oauth_id);
DROP INDEX IF EXISTS idx_members_google_id;
