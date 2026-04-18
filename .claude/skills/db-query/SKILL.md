---
name: db-query
description: Run D1 database queries against local or remote eat-sheet-db
disable-model-invocation: true
---

# /db-query

Run SQL queries against the eat-sheet D1 database.

## Usage

```
/db-query <sql>                  # read-only query against local DB
/db-query --remote <sql>         # read-only query against production DB
/db-query --mutate <sql>         # mutation against local DB (with confirmation)
/db-query --remote --mutate <sql> # mutation against production (with confirmation)
```

## Behavior

Parse the input for flags (`--remote`, `--mutate`) and extract the SQL query.

**Read-only queries (default):** Execute immediately, no confirmation needed.

```bash
npx wrangler d1 execute eat-sheet-db [--local|--remote] --command "<sql>"
```

**Mutations (`--mutate`):** Show the SQL and ask for confirmation before executing. Mutations include INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.

**Auto-detect mutations:** If the user omits `--mutate` but the SQL contains a mutation keyword, warn and ask for confirmation before executing.

**Default is local.** Only use `--remote` when explicitly requested — production queries need intentional opt-in.

## Examples

```
/db-query SELECT * FROM tenants
/db-query SELECT COUNT(*) FROM floor_plans WHERE tenant_id = 'abc'
/db-query --remote SELECT * FROM tenants
/db-query --mutate DELETE FROM floor_plans WHERE tenant_id = 'test-123'
```

## Output

Format the results as a readable table when possible. For large result sets, summarize the row count and show the first 10 rows.
