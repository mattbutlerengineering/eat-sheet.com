---
name: create-migration
description: Create a new D1 database migration file with sequential numbering
disable-model-invocation: true
args: migration-name
---

# Create Migration

Scaffold a new D1 migration file with the next sequential number.

## Steps

1. Find the highest migration number:
   ```bash
   ls src/server/db/migrations/*.sql | sort -V | tail -1
   ```

2. Increment the number (e.g., `002` → `003`)

3. Create the migration file at `src/server/db/migrations/{number}_{name}.sql` using the kebab-case name argument

4. Add a comment header with the migration name and date

5. Remind the user to:
   - Also update `src/server/db/schema.sql` for fresh installs
   - Apply locally: `npx wrangler d1 execute eat-sheet-db --local --file=<path>`
   - Apply to production: `npx wrangler d1 execute eat-sheet-db --remote --file=<path>`

## Important

- NEVER edit existing migration files — they may already be applied to production
- SQLite `ALTER TABLE` can't add NOT NULL without DEFAULT — use DEFAULT with CHECK constraint
- D1 enforces foreign keys — every FK reference must point to an existing row
- Use `TEXT PRIMARY KEY` with `nanoid()` — SQLite TEXT PKs don't auto-generate
