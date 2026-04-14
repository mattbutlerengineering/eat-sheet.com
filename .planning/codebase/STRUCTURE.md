# Codebase Structure

**Analysis Date:** 2026-04-11

## Directory Layout

```
/Users/mbutler/github/eat-sheet.com/
├── src/
│   ├── server/                    # Backend (Hono on Cloudflare Workers)
│   │   ├── index.ts             # Entry point, route registration
│   │   ├── types.ts            # Shared TypeScript interfaces
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Cross-cutting
│   │   ├── db/                # SQL schema & migrations
│   │   ├── __tests__/          # Integration tests
│   │   └── utils/             # Utilities (cuisine-types, oauth, etc.)
│   ├── client/                  # Frontend (React 19 SPA)
│   │   ├── main.tsx           # React entry
│   │   ├── App.tsx            # Router setup
│   │   ├── pages/             # Route pages (lazy-loaded)
│   │   ├── components/        # Shared components
│   │   ├── hooks/             # React hooks (useApi, useAuth, useTenant)
│   │   ├── registry/          # Reusable UI components
│   │   ├── catalog/           # Zod schemas for client validation
│   │   └── types/             # Client TypeScript types
│   ├── shared/                  # Shared between server/client
│   │   └── permissions.ts      # Permission keys
│   └── features/                # Feature-specific (floor plan editor)
│       └── floorplan/
├── .planning/                    # Generated planning docs
├── docs/                       # Documentation
├── scripts/                     # Build/deploy scripts
├── tests/                      # E2E tests (Playwright)
└── configuration files
```

## Directory Purposes

**`src/server/routes`:**
- Purpose: HTTP endpoint handlers using Hono
- Contains: auth.ts, tenants.ts, members.ts, roles.ts, floor-plans.ts, guests.ts, service-periods.ts, reservations.ts, waitlist.ts, assignments.ts, dashboard.ts
- Key files: `reservations.ts` (274 lines), `guests.ts`, `floor-plans.ts`

**`src/server/services`:**
- Purpose: Business logic and state machines
- Contains: reservation-service.ts, table-service.ts, availability-service.ts, waitlist-service.ts
- Key files: `reservation-service.ts` (state machine), `table-service.ts`

**`src/server/middleware`:**
- Purpose: Cross-cutting concerns applied via `.use()` or route-registration
- Contains: auth.ts (JWT verification), tenant.ts (tenant scope validation), permission.ts (RBAC), rate-limit.ts

**`src/server/db`:**
- Purpose: Database schema and migrations
- Files: `schema.sql` (236 lines), `seed.sql`, `migrations/001_foundation.sql`

**`src/server/__tests__`:**
- Purpose: Integration tests with mock D1 bindings
- Files: helpers/mock-db.ts, auth helpers, route test files (*.test.ts)

**`src/client/pages`:**
- Purpose: React Router pages (code-split via lazy)
- Contains: Dashboard.tsx, FloorPlan.tsx, Reservations.tsx, Waitlist.tsx, Guests.tsx, Settings.tsx, Login.tsx, AuthCallback.tsx, Setup.tsx

**`src/client/registry/components`:**
- Purpose: Reusable UI components
- Contains: Badge.tsx, DataTable.tsx, Page.tsx, CardGrid.tsx, EmptyState.tsx, PageHeader.tsx, StatCard.tsx, StatusIndicator.tsx, TableCard.tsx, ReservationRow.tsx, GuestCard.tsx, FloorPlanGrid.tsx, ActionButton.tsx, WaitlistEntry.tsx

**`src/client/hooks`:**
- Purpose: React hooks for API/auth/tenant access
- Contains: useApi.ts (fetch wrapper), useAuth.ts, useTenant.ts, useSpec.ts

**`src/client/catalog/schemas`:**
- Purpose: Zod schemas for client-side validation
- Contains: common.ts, guests.ts, reservations.ts, tables.ts, waitlist.ts

## Key File Locations

**Entry Points:**
- `src/server/index.ts` - Hono app, middleware registration, route mounting
- `src/client/main.tsx` - React mount point
- `src/client/App.tsx` - BrowserRouter, Routes, lazy pages

**Configuration:**
- `wrangler.toml` - Cloudflare Workers config (D1, R2, bindings)
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Vite/React build config
- `vitest.config.ts` - Test runner config
- `playwright.config.ts` - E2E test config

**Core Logic:**
- `src/server/types.ts` - TypeScript interfaces (Env, Tenant, User, Reservation, Guest, etc.)
- `src/server/db/schema.sql` - DDL with tenant_id on all business tables

**Testing:**
- `src/server/__tests__/helpers/mock-db.ts` - D1 mock for tests
- `src/server/__tests__/helpers/auth.ts` - JWT token helpers
- `src/server/__tests__/helpers/mock-r2.ts` - R2 mock for photo tests

## Naming Conventions

**Files:**
- Routes: `{entity}.ts` (reservations.ts, guests.ts)
- Services: `{entity}-service.ts` (reservation-service.ts)
- Middleware: `{concern}.ts` (auth.ts, permission.ts)
- Pages: PascalCase (Dashboard.tsx, FloorPlan.tsx)
- Components: PascalCase (Badge.tsx, DataTable.tsx)
- Hooks: camelCase (useApi.ts, useAuth.ts)

**Directories:**
- Routes: kebab-lowercase (routes/, services/)
- Pages: PascalCase (pages/)

**Database Tables:**
- snake_case (reservations, waitlist_entries, server_assignments)
- tenant_id appears on ALL business tables

## Where to Add New Code

**New API Route:**
- Implementation: `src/server/routes/{entity}.ts`
- Tests: `src/server/__tests__/{entity}.test.ts`
- Pattern: Create Hono router, register in `src/server/index.ts` under `/api/t/:tenantId/`

**New Service:**
- Implementation: `src/server/services/{entity}-service.ts`
- Pattern: Complex business logic, state machines, cross-table operations

**New Middleware:**
- Implementation: `src/server/middleware/{concern}.ts`
- Pattern: Cross-cutting; register in `src/server/index.ts`

**New Client Page:**
- Implementation: `src/client/pages/{PageName}.tsx`
- Registry: Add to lazy import in `src/client/App.tsx`, add Route

**New Client Component:**
- Implementation: `src/client/registry/components/{ComponentName}.tsx`
- Pattern: Reusable; use from pages

**New Database Table:**
- DDL: Add to `src/server/db/schema.sql`
- Migration: Create `src/server/db/migrations/XXX_{description}.sql`

**New Permission:**
- Add to: `src/shared/permissions.ts`
- Check in: `src/server/middleware/permission.ts` (via requirePermission())

---

*Structure analysis: 2026-04-11*