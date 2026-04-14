# eat-sheet.com

## What This Is

Multi-tenant SaaS hospitality platform for restaurants. Phase 1 (FOH - Front of House) covers floor plans, tables, reservations, waitlist, guest profiles, service periods, and server assignments. Built on Cloudflare Workers with React 19 client.

## Core Value

Enable restaurant staff to manage front-of-house operations (reservations, waitlist, table assignments, guest profiles) through a role-based interface with real-time floor plan visualization.

## Requirements

### Validated

- ✓ Multi-tenant architecture with tenant_id isolation — existing
- ✓ Google OAuth authentication via arctic — existing
- ✓ JWT-based session management — existing
- ✓ Role-based permissions system — existing
- ✓ Floor plan management (create, activate, delete) — existing
- ✓ Section management within floor plans — existing
- ✓ Table management with capacity and status — existing
- ✓ Guest profiles with visit history — existing
- ✓ Service period configuration — existing
- ✓ Reservation CRUD with state transitions — existing
- ✓ Waitlist management with position tracking — existing
- ✓ Server assignments to sections — existing
- ✓ Dashboard with json-render specs — existing

### Active

- [ ] [Add your new requirements here]

### Out of Scope

- [Exclusion 1] — [why]
- [Exclusion 2] — [why]

## Context

**Brownfield project** — Existing codebase at `src/`. Codebase map exists at `.planning/codebase/`.

**Technology:**
- Server: Hono on Cloudflare Workers
- Client: React 19 + Tailwind v4 + React Router 7
- Database: D1 SQLite
- Storage: R2 bucket for photos

**Key files:**
- Server routes: `src/server/routes/`
- Services: `src/server/services/`
- Client pages: `src/client/pages/`
- Database schema: `src/server/db/schema.sql`

## Constraints

- **Cloudflare Workers**: Must stay within Workers-compatible APIs
- **D1 SQLite**: Schema changes require migrations
- **Multi-tenant**: All business data must have tenant_id

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hono framework | Edge-optimized, lightweight | ✓ Good |
| React 19 | Modern React with concurrent features | ✓ Good |
| json-render | Server-driven UI with role-based specs | ✓ Good |
| D1 SQLite | Serverless database with ACID | ✓ Good |

---
*Last updated: 2026-04-11 after project initialization*