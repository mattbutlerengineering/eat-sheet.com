# Codebase Concerns

**Analysis Date:** 2026-04-11

## Tech Debt

**Silent Error Handling:**
- Issue: Multiple routes use bare `catch` blocks that swallow errors without logging
- Files: `src/server/routes/waitlist.ts` (lines 95, 158, 201, 292), `src/server/routes/auth.ts` (line 89), `src/server/routes/reservations.ts` (lines 128, 192, 233), `src/server/routes/roles.ts` (lines 67, 127), `src/server/routes/members.ts` (lines 80, 126), `src/server/routes/guests.ts` (lines 90, 160)
- Impact: Errors are silently ignored, debugging is difficult, users may receive generic 500 errors without context
- Fix approach: Add error logging before catch blocks, return specific error messages

**Rate Limiter Memory Store:**
- Issue: Rate limiter uses in-memory Map that doesn't persist across Cloudflare Workers instances
- Files: `src/server/middleware/rate-limit.ts` (line 40)
- Impact: Rate limiting is ineffective under load-balancing; each request may hit a different worker with empty state
- Fix approach: Use Workers KV or Durable Objects for distributed rate limiting

**Missing Database Index:**
- Issue: No composite index on `(tenant_id, date, time)` for reservation queries
- Files: `src/server/db/schema.sql`
- Impact: Reservation queries by date/time may be slow as tenant data grows
- Fix approach: Add index on `(tenant_id, date, time)` for reservations table

**Large Route Files:**
- Issue: Several route files exceed 250 lines, indicating potential complexity
- Files: `src/server/routes/floor-plans.ts` (494 lines), `src/server/routes/waitlist.ts` (312 lines), `src/server/routes/reservations.ts` (274 lines)
- Impact: Hard to maintain, test, and extend; suggests need for service layer extraction
- Fix approach: Extract business logic to service files in `src/server/services/`

## Known Bugs

**OAuth State Validation:**
- Issue: OAuth state parameter is not validated on callback — relies only on client-side code_verifier
- Files: `src/server/routes/auth.ts` (lines 59-67)
- Trigger: Any user could replay a previous authorization code
- Workaround: Client-side code_verifier provides some protection via PKCE

**Reserved Status Not Enforced:**
- Issue: No validation that reserved tables can't be double-booked
- Files: `src/server/routes/reservations.ts`
- Trigger: Creating two reservations for same table at overlapping times
- Workaround: Add table availability check before reservation creation

## Security Considerations

**No CSRF Token for State Parameter:**
- Issue: OAuth state generated server-side but not stored/validated server-side
- Files: `src/server/routes/auth.ts` (lines 50-52)
- Current mitigation: PKCE code_verifier provides some protection
- Recommendations: Store OAuth state in KV or verify state matches session

**JWT Secret Missing Handling:**
- Issue: Returns generic "Server configuration error" if JWT_SECRET is missing
- Files: `src/server/middleware/auth.ts` (lines 18-20)
- Current mitigation: Returns 500 error
- Recommendations: Fail fast at startup if required env vars are missing

**No Input Sanitization for SQL:**
- Issue: Raw SQL queries used throughout; relies entirely on parameterized queries
- Files: All route files in `src/server/routes/`
- Current mitigation: All queries appear to use `.bind()` for parameters
- Recommendations: Audit all queries to ensure no string concatenation for user input

**CORS Origin Validation:**
- Issue: CORS origin check returns empty string for non-local origins
- Files: `src/server/index.ts` (lines 26-31)
- Current mitigation: No wildcard CORS
- Recommendations: Explicitly whitelist domains in environment config

## Performance Bottlenecks

**No Query Pagination Defaults:**
- Issue: Limit/offset required in query params but no defaults
- Files: `src/server/routes/reservations.ts`, `src/server/routes/guests.ts`, `src/server/routes/members.ts`
- Cause: Missing LIMIT clause in queries without pagination params
- Improvement path: Add default LIMIT of 50 to list endpoints

**N+1 Query Pattern in Auth Refresh:**
- Issue: `/api/auth/refresh` re-fetches permissions from database each call
- Files: `src/server/routes/auth.ts` (lines 167-178)
- Cause: Loading role permissions on every token refresh
- Improvement path: Cache permissions in JWT payload, accept longer expiry

## Fragile Areas

**Floor Plan Editor:**
- Files: `src/features/floorplan/components/FloorPlanEditor.tsx` (252 lines), `src/server/routes/floor-plans.ts` (494 lines)
- Why fragile: Complex canvas interactions, heavy state management, no undo/redo
- Safe modification: Test drag-and-drop interactions, table position updates
- Test coverage: Only basic CRUD tested, drag operations not covered

**Waitlist Position Rebalancing:**
- Files: `src/server/services/waitlist-service.ts`
- Why fragile: Position reordering has race condition potential under concurrent adds
- Safe modification: Test concurrent waitlist additions and status changes
- Test coverage: Limited concurrent-operation testing

## Scaling Limits

**In-Memory Rate Limiting:**
- Current capacity: Single worker only, resets on worker restart
- Limit: Broken under multi-worker deployment
- Scaling path: Migrate to KV or Durable Objects

**Single Database Connection:**
- Current capacity: D1 SQLite under Cloudflare
- Limit: D1 performance at high query volume
- Scaling path: Read replicas, query optimization, caching

## Dependencies at Risk

**Zod v4:**
- Risk: Using Zod v4.3.6 which is newer; potential breaking changes
- Impact: Schema validation behavior changes
- Migration plan: Pin to specific version in package.json, test migrations

**Hono v4:**
- Risk: Major version may have API changes
- Impact: Routing/middleware behavior changes
- Migration plan: Test comprehensively on version bumps

## Missing Critical Features

**Request Logging:**
- Problem: No structured request logging for API calls
- Blocks: Understanding API usage patterns, debugging issues
- Priority: High

**API Rate Limiting Per-User:**
- Problem: Rate limit is IP-based, not user-based
- Priority: Medium

**Database Backup/Recovery:**
- Problem: No automated D1 backups configured
- Priority: High

## Test Coverage Gaps

**Concurrent Operations:**
- What's not tested: Concurrent waitlist adds, simultaneous reservation creates
- Files: `src/server/routes/waitlist.ts`, `src/server/routes/reservations.ts`
- Risk: Race conditions undetected
- Priority: High

**Error Recovery Paths:**
- What's not tested: Database errors, R2 upload failures
- Files: All route files with `.run()` calls
- Risk: Silent failures in production
- Priority: High

**Floor Plan Drag Operations:**
- What's not tested: Table drag, drop, combine/uncombine
- Files: `src/client/pages/FloorPlan.tsx`, `src/server/routes/floor-plans.ts`
- Risk: UI bugs undetected
- Priority: Medium

---

*Concerns audit: 2026-04-11*