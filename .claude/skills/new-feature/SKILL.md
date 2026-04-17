---
name: new-feature
description: Scaffold a new feature module with routes, service, repository, types, schema, and tests following eat-sheet conventions.
disable-model-invocation: true
args: feature-name
---

# New Feature Scaffold

Create a new feature module following eat-sheet's layered architecture.

## Arguments

- `feature-name` (required): kebab-case name (e.g., `reservations`, `waitlist`)

## Files to Create

Given feature name `{name}`:

### Server
- `src/server/features/{name}/types.ts` — DB row interfaces (readonly fields, snake_case columns)
- `src/server/features/{name}/repository.ts` — D1 queries (import nanoid, parameterized statements)
- `src/server/features/{name}/service.ts` — Business logic + row-to-API mappers (toXxx functions)
- `src/server/features/{name}/routes.ts` — Hono route handlers (import authMiddleware, requirePermission, ok/error response helpers)
- `src/server/features/{name}/__tests__/routes.test.ts` — Route tests (vi.mock repository, app.request pattern)
- `src/server/features/{name}/__tests__/service.test.ts` — Service mapper tests

### Shared
- `src/shared/types/{name}.ts` — API response interfaces (readonly, camelCase)
- `src/shared/schemas/{name}.ts` — Zod validation schemas

### Wiring
- Add route import + `app.route("/api/t", {name})` in `src/server/index.ts`
- Re-export types from `src/shared/types/index.ts`
- Re-export schemas from `src/shared/schemas/index.ts`

## Conventions

- All types use `readonly`
- Use `nanoid()` for IDs
- Routes mount on `/api/t/:tenantId/{name}` with `authMiddleware`
- Domain errors in service, HTTP mapping in routes
- Mock repository at module boundary in route tests
- Follow existing patterns in `src/server/features/venues/` as reference
