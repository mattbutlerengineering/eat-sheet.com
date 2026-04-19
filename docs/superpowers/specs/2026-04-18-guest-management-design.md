# Guest Management Design Spec

**Date:** 2026-04-18
**Issue:** #84
**Status:** Draft

## Context

Guests is the first Wave 1 feature for rebuilding FOH core operations in v2. Guest profiles are referenced by reservations (#87) and waitlist (#88), making this a foundational dependency. The feature follows the existing route → service → repository layering.

## Data Model

### `guests` table (migration `004_guests.sql`)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | TEXT | PRIMARY KEY | nanoid() |
| tenant_id | TEXT | NOT NULL, FK tenants(id) ON DELETE CASCADE | |
| name | TEXT | NOT NULL | Full name, single field |
| email | TEXT | | Nullable |
| phone | TEXT | | Nullable |
| notes | TEXT | | Free-text staff notes |
| tags | TEXT | NOT NULL DEFAULT '[]' | JSON array of strings |
| visit_count | INTEGER | NOT NULL DEFAULT 0 | Denormalized, updated by reservations |
| last_visit_at | TEXT | | Nullable ISO timestamp |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |
| updated_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |

**Indexes:**
- `idx_guests_tenant` on `(tenant_id)`
- `idx_guests_tenant_email` on `(tenant_id, email)`
- `idx_guests_tenant_phone` on `(tenant_id, phone)`

**Deletion:** Hard delete (matches codebase convention). Future reservations referencing a deleted guest will use `ON DELETE SET NULL` on their `guest_id` FK.

### Why single `name` field?

Hospitality staff think in full names ("Table for Johnson"), not first/last splits. A single field is simpler to search, display, and enter. If structured name parts are needed later, they can be added without breaking the existing field.

### Why JSON tags?

D1/SQLite `json_each()` enables querying into JSON arrays without a pivot table. At restaurant scale (hundreds to low thousands of guests), this performs well and avoids schema complexity.

## API Endpoints

All routes mounted at `/api/t/:tenantId/guests`. Auth middleware + permission checks applied.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | `guests:read` | List guests (paginated, searchable, filterable) |
| GET | `/:guestId` | `guests:read` | Get single guest |
| POST | `/` | `guests:write` | Create guest |
| PATCH | `/:guestId` | `guests:write` | Update guest |
| DELETE | `/:guestId` | `guests:write` | Hard delete guest |

### Query Parameters (GET `/`)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | — | Search name, email, phone (SQL LIKE) |
| `tag` | string | — | Filter by tag (exact match in JSON array) |
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Results per page (max 100) |
| `sort` | string | `created_at` | Sort field: `name`, `created_at`, `visit_count`, `last_visit_at` |
| `order` | string | `desc` | Sort direction: `asc`, `desc` |

### Request/Response Examples

**Create (POST):**
```json
{
  "name": "Sarah Johnson",
  "email": "sarah@example.com",
  "phone": "+1-555-0123",
  "notes": "Prefers booth seating",
  "tags": ["regular", "vip"]
}
```

**List (GET, paginated):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "abc123",
      "tenantId": "tenant_1",
      "name": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "+1-555-0123",
      "notes": "Prefers booth seating",
      "tags": ["regular", "vip"],
      "visitCount": 12,
      "lastVisitAt": "2026-04-15T19:30:00.000Z",
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-04-15T19:30:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50 }
}
```

## Shared Schemas (Zod)

### `src/shared/schemas/guest.ts`

```typescript
createGuestSchema: { name (required, 1-100), email (optional email), phone (optional, max 20), notes (optional, max 500), tags (string array, default []) }
updateGuestSchema: createGuestSchema.partial()
```

### `src/shared/types/guest.ts`

```typescript
Guest: { id, tenantId, name, email, phone, notes, tags, visitCount, lastVisitAt, createdAt, updatedAt }
```

## Server Implementation

### Feature Module: `src/server/features/guests/`

| File | Responsibility |
|------|---------------|
| `routes.ts` | HTTP boundary — parse params, validate with Zod, call service/repository, return response envelope |
| `service.ts` | Transform `GuestRow` → `Guest` (snake_case → camelCase) |
| `repository.ts` | D1 queries — CRUD, search, count, tag filter |
| `types.ts` | `GuestRow` interface (readonly, snake_case) |

### Search Implementation

```sql
SELECT * FROM guests
WHERE tenant_id = ?
  AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
ORDER BY created_at DESC
LIMIT ? OFFSET ?
```

Search term wrapped with `%` on both sides for substring matching.

### Tag Filter Implementation

```sql
SELECT * FROM guests
WHERE tenant_id = ?
  AND ? IN (SELECT value FROM json_each(tags))
```

### Route Registration

Add to `src/server/index.ts`: `app.route("/api/t", guests);`

## Client Implementation

### Pages

**`src/client/pages/Guests.tsx`** — Main guest list page:
- Search input (debounced 300ms, fires on type)
- Tag filter chips (populated from unique tags across guests)
- Paginated table: name, email, phone, tags, visit count, last visit
- Click row → open guest detail drawer/modal
- "Add Guest" button → create form

### Components: `src/client/features/guests/`

| Component | Purpose |
|-----------|---------|
| `GuestList` | Table with search, filters, pagination controls |
| `GuestDetail` | Drawer/modal showing full guest info + edit form |
| `GuestForm` | Create/edit form (react-hook-form + Zod) |
| `GuestTagBadge` | Styled tag chip |

### Dashboard Integration

In `src/client/pages/Dashboard.tsx`, update NAV_ITEMS:
```typescript
{ label: "Guests", active: false, path: "/guests" }
```

Add route in `src/client/App.tsx`.

## Tests

### Server Tests: `src/server/features/guests/__tests__/`

| Test File | Coverage |
|-----------|----------|
| `routes.test.ts` | All endpoints, auth/permission checks, validation errors, 404s |
| `repository.test.ts` | CRUD operations, search, tag filtering, pagination |
| `service.test.ts` | Row → API type transformation |

### Shared Tests

- Zod schema validation (valid/invalid inputs, edge cases)

### Test Patterns
- Mock D1 with `vi.fn()` returning `prepare/bind/first/run/all`
- Mock repository at module boundary (`vi.mock("../repository")`)
- Auth tests: create Hono app with middleware, use `app.request()`

## Migration Safety

- New table only (no ALTER on existing tables)
- No data migration needed
- Safe to apply to production without downtime
- Add table definition to `schema.sql` for reference
