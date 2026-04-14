# Architecture

**Analysis Date:** 2026-04-11

## Pattern Overview

**Overall:** Multi-tenant hospitality platform with three-tier API architecture

**Key Characteristics:**
- Tiered routing: Public → Authenticated → Tenant-scoped
- Middleware chain for cross-cutting concerns (auth → tenant scope → permissions)
- Service layer for business logic isolation
- Row-level tenant isolation via `tenant_id` foreign keys

## Layers

**Client (Frontend Layer):**
- Purpose: React 19 SPA with React Router 7 for page navigation
- Location: `src/client/`
- Contains: Pages, components, hooks, catalog schemas
- Depends on: `/api/t/:tenantId/*` endpoints
- Used by: Browser via Vite dev server

**API Route Layer:**
- Purpose: HTTP request handling with input validation
- Location: `src/server/routes/`
- Contains: Route modules (reservations.ts, guests.ts, floor-plans.ts, etc.)
- Depends on: Services, middleware, D1 database
- Used by: Client via fetch

**Service Layer:**
- Purpose: Business logic and state transitions
- Location: `src/server/services/`
- Contains: reservation-service.ts, table-service.ts, availability-service.ts, waitlist-service.ts
- Depends on: D1 database
- Used by: Route handlers

**Middleware Layer:**
- Purpose: Cross-cutting concerns (auth, tenant scoping, permissions)
- Location: `src/server/middleware/`
- Contains: auth.ts, tenant.ts, permission.ts, rate-limit.ts
- Depends on: JWT verification, role_permissions join
- Used by: Route registration in index.ts

**Database Layer:**
- Purpose: Persistent storage with tenant isolation
- Location: D1 SQLite via `c.env.DB`
- Contains: Multi-tenant schema with tenant_id foreign keys
- Tables: tenants, users, roles, permissions, tenant_members, floor_plans, sections, tables, guests, service_periods, reservations, waitlist_entries, server_assignments

## Data Flow

**Typical Request Flow:**

1. Client calls `/api/t/:tenantId/reservations` via `useApi()` hook
2. Route registration applies middleware chain:
   - `authMiddleware` verifies JWT, extracts userId/tenantId/permissions
   - `tenantScope` validates URL tenantId matches JWT tenantId
   - `requirePermission('reservations.view')` checks permission list
3. Route handler (`reservationRoutes.get('/')`) executes query via D1
4. Service functions for complex logic (e.g., `transitionReservation()`)
5. Response returned to client as `{ success: boolean; data?: T; error?: string }`

**Create Reservation Flow:**

1. POST with JSON body → Zod validation schema
2. Route handler extracts validated fields
3. D1 INSERT with nanoid() primary key
4. Service handles side effects (update table status, increment visit_count)

## Key Abstractions

**Tenant Scoping:**
- Pattern: All business routes use `/api/t/:tenantId/*` prefix
- Examples: `src/server/routes/reservations.ts`, `src/server/routes/guests.ts`
- Enforcement: `tenantScope` middleware validates JWT tenantId matches URL

**Permission System:**
- Pattern: Role-based access via permission keys assigned to roles
- Examples: `requirePermission('reservations.view')` in routes
- Implementation: `src/server/middleware/permission.ts` checks `payload.permissions` array
- Wildcard: `'*'` grants all permissions

**State Machine for Reservations:**
- Pattern: Valid status transitions defined in service
- Examples: `src/server/services/reservation-service.ts`
- Transitions: `confirmed → {seated, cancelled, no_show}` → `{completed, no_show}`

**State Machine for Tables:**
- Pattern: Table status transitions tied to reservation lifecycle
- Examples: `src/server/services/table-service.ts`
- States: available, occupied, reserved, blocked

## Entry Points

**Server Entry:**
- Location: `src/server/index.ts`
- Triggers: Cloudflare Workers fetch handler via Sentry.withSentry wrapper
- Responsibilities: Hono app init, CORS, middleware registration, route mounting, error handling

**Client Entry:**
- Location: `src/client/main.tsx` → `src/client/App.tsx`
- Triggers: Browser navigation, Vite dev server
- Responsibilities: React 19 mount, React Router setup, lazy page loading

**Database Entry:**
- Location: D1 via `c.env.DB` binding
- Schema: `src/server/db/schema.sql`
- Migrations: `src/server/db/migrations/`

## Error Handling

**Strategy:** JSON error envelope with HTTP status codes

**Patterns:**
- Route errors: `c.json({ success: false, error: 'message' }, status)`
- Middleware errors: `c.json({ error: 'message' }, 401|403)`
- Service errors: `{ success: false, error: string }` returned to caller at route layer
- Unhandled: Sentry.captureException + generic 500 response

## Cross-Cutting Concerns

**Logging:** Console.error for request errors, Sentry for 5xx capture

**Validation:** Zod schemas co-located with route definitions

**Authentication:** JWT via hono/jwt (HS256), Google OAuth via arctic

**Tenant Isolation:** tenant_id foreign keys on all business tables + tenantScope middleware

---

*Architecture analysis: 2026-04-11*