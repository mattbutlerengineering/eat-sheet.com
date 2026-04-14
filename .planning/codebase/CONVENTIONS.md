# Coding Conventions

**Analysis Date:** 2026-04-11

## Naming Patterns

**Files:**
- Routes/Endpoints: `kebab-case.ts` (e.g., `auth.ts`, `floor-plans.ts`, `reservations.ts`)
- Services: `kebab-case-service.ts` (e.g., `waitlist-service.ts`, `reservation-service.ts`)
- Middleware: `kebab-case.ts` (e.g., `auth.ts`, `tenant.ts`, `permission.ts`)
- Client hooks: `camelCase.ts` (e.g., `useApi.ts`, `useAuth.ts`, `useTenant.ts`)

**Functions:**
- Route handlers: Use Hono patterns with inline handlers (e.g., `authRoutes.post('/google', async (c) => {...})`)
- Service functions: `camelCase`, verb-first (e.g., `estimateWait()`, `rebalancePositions()`, `canTransitionWaitlist()`)
- Helper functions: `camelCase` (e.g., `generateCodeVerifier()`, `makeJwtPayload()`)

**Variables:**
- Local variables: `camelCase` (e.g., `userId`, `tenantId`, `codeVerifier`)
- Constants: `UPPER_SNAKE_CASE` for true constants (e.g., `JWT_EXPIRY_SECONDS`, `DEFAULT_TURN_TIME`)
- SQL bindings: Underscore-prefixed for params (e.g., `_sql`, `_params`)

**Types:**
- Interfaces: `PascalCase` (e.g., `Env`, `JwtPayload`, `Tenant`, `User`, `Reservation`)
- API Response envelope: `ApiResponse<T>` generic interface
- Database results: Inline types with `<T = unknown>` generic

## Code Style

**Formatting:**
- Tool: Not explicitly configured (relying on TypeScript strictness)
- 2-space indentation
- Single quotes for strings
- Trailing semicolons

**TypeScript Strictness:**
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noUncheckedIndexedAccess: true`
- `noFallthroughCasesInSwitch: true`

**Linting:**
- No explicit ESLint config
- Relying on `tsc -b` for type checking in build

## Import Organization

**Order:**
1. External frameworks (e.g., `import { Hono } from 'hono';`)
2. External libs (e.g., `import { sign } from 'hono/jwt';`, `import { Google } from 'arctic';`)
3. External validation (e.g., `import { z } from 'zod';`)
4. Internal types (e.g., `import type { Env, AppVariables } from '../types';`)
5. Internal modules (e.g., `import { authMiddleware } from '../middleware/auth';`)

**Path Aliases:**
- `@server/*` → `./src/server/*`
- `@client/*` → `./src/client/*`
- `@features/*` → `./src/features/*`

## Error Handling

**Routes:**
```typescript
// Standard error response pattern
return c.json({ success: false, error: 'Error message' }, statusCode);
// Example
return c.json({ success: false, error: 'Missing code or state parameter' }, 400);
```

**Middleware:**
- Auth failures: JSON `{ error: '...' }` with 401
- Config errors: JSON `{ error: 'Server configuration error' }` with 500

**Global Error Handler:**
- Location: `src/server/index.ts`
- Pattern: `app.onError()` catches all unhandled exceptions
- Logs stack to console, captures to Sentry, returns generic 500 response

## Logging

**Framework:** Console + Sentry
- Console: `console.error()` in error handler
- Sentry: `@sentry/cloudflare` for production error capture
- API errors captured automatically via middleware in `src/server/index.ts`

## Comments

**When to Comment:**
- Complex SQL queries (inline explainers)
- Security-sensitive operations (PKCE flow)
- Non-obvious business logic (waitlist status transitions)

**No JSDoc/TSDoc observed** in codebase

## Function Design

**Size:** Route files can be large (274 lines in auth.ts), but handlers are single-purpose

**Parameters:**
- Hono handlers: Single `c` parameter, access bindings via `c.env` and `c.req`
- Service functions: Explicit typed parameters (e.g., `(db: D1Database, tenantId: string, partySize: number)`)

**Return Values:**
- Routes: Always `c.json({ success, data?, error? }, statusCode)`
- Services: Return TypedPromise results or void

## Module Design

**Server Exports:**
- Named exports only (e.g., `export const authRoutes = new Hono<HonoEnv>();`)
- Factory pattern for services (e.g., `export async function estimateWait(...)`)

**Client Exports:**
- Named exports from hooks
- React Query pattern via custom hooks

**Barrel Files:**
- `src/server/types.ts` - All server types
- `src/client/catalog/index.ts` - Schema catalog

## API Response Envelope

**Standard format:**
```typescript
{ success: boolean; data?: T; error?: string; meta?: { total: number; page: number; limit: number } }
```

**Usage:** All route handlers return this envelope

---

*Convention analysis: 2026-04-11*