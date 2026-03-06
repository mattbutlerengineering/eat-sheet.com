-- updated_at column already exists on reviews; backfill any NULLs
UPDATE reviews SET updated_at = created_at WHERE updated_at IS NULL;
