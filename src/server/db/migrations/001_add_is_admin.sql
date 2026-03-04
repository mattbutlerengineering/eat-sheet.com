ALTER TABLE members ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

UPDATE members SET is_admin = 1
WHERE id = (
  SELECT id FROM members
  WHERE family_id = (SELECT id FROM families LIMIT 1)
  ORDER BY created_at ASC
  LIMIT 1
);
