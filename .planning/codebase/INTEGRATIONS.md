# External Integrations

**Analysis Date:** 2026-04-11

## APIs & External Services

**OAuth/Identity:**
- Google OAuth 2 (PKCE) - User authentication
  - SDK/Client: `arctic` 3.7.0
  - Implementation: `src/server/routes/auth.ts` (Google class from arctic)
  - Env vars: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
  - Redirect: `/api/auth/google/callback`

## Data Storage

**Database:**
- Cloudflare D1 (SQLite)
  - Binding: `DB` in wrangler.toml
  - Database name: `eat-sheet-db`
  - Database ID: `a606f1f7-605f-4f8e-9c5d-9e3b1a789752`
  - Client: Cloudflare D1 driver (via c.env.DB)
  - Migrations: `src/server/db/migrations/`
  - Schema: `src/server/db/schema.sql`

**File Storage:**
- Cloudflare R2 (S3-compatible)
  - Binding: `PHOTOS` in wrangler.toml
  - Bucket name: `eat-sheet-photos`
  - Use case: Restaurant/guest photo storage
  - Client: Cloudflare R2 driver (via c.env.PHOTOS)

**Caching:**
- None dedicated (uses Vite PWA Service Worker for client-side caching)

## Authentication & Identity

**Auth Provider:**
- Custom JWT via `hono/jwt`
  - Token: HS256 signed JWT with 24-hour expiry
  - Payload: `{ userId, tenantId, roleId, permissions, exp }`
  - Location: `src/server/middleware/auth.ts`
  - Secret: `JWT_SECRET` env var
  - Middleware: `authMiddleware` validates JWT on protected routes

**Session:**
- OAuth flow: Google OAuth 2 with PKCE
  - 1. Client requests `/api/auth/google` → receives auth URL + state + codeVerifier
  - 2. User redirected to Google, authorizes
  - 3. Google redirects to `/api/auth/google/callback?code&state`
  - 4. Client sends code + code_verifier to `/api/auth/google/callback` (POST)
  - 5. Server exchanges code for tokens, fetches user info, issues JWT

## Monitoring & Observability

**Error Tracking:**
- Sentry (Cloudflare Workers + React)
  - SDK: `@sentry/cloudflare` 10.42.0 (server), `@sentry/react` 10.42.0 (client)
  - Server hook: `src/server/index.ts` exports `Sentry.withSentry(app)`
  - Client: Configured through vite.config.ts (manualChunks vendor)
  - Env var: `SENTRY_DSN`
  - Captures: 5xx responses, unhandled exceptions

**Logs:**
- Console logging via `console.error` in error handler
- Structured: `[METHOD] /path: error message`

**Analytics:**
- PostHog (configured but not actively used in codebase)
  - SDK: `posthog-js` 1.359.1
  - Not imported in client code

**Web Vitals:**
- web-vitals 5.1.0 (installed but not imported in client code)

## CI/CD & Deployment

**Hosting:**
- Cloudflare Workers (via Pages or directly)
- Pages deployment: `npm run deploy` → `wrangler pages deploy dist`

**CI Pipeline:**
- Not explicitly defined in package.json
- Deployment via `wrangler deploy` or `wrangler pages deploy`

## Environment Configuration

**Required env vars:**
- `JWT_SECRET` - Secret key for JWT signing
- `GOOGLE_OAUTH_CLIENT_ID` - Google OAuth app client ID
- `GOOGLE_OAUTH_CLIENT_SECRET` - Google OAuth app client secret
- `OAUTH_REDIRECT_BASE` - Base URL for OAuth redirects (e.g., https://eat-sheet.com)
- `SENTRY_DSN` - Sentry project DSN for error reporting

**Secrets location:**
- Cloudflare Workers secrets (via `wrangler secret put`)
- Local dev: `.env` file (committed, only safe defaults)

**Bindings:**
- `DB` - D1 database binding
- `PHOTOS` - R2 bucket binding

## Webhooks & Callbacks

**Incoming:**
- None configured explicitly
- OAuth callback: `/api/auth/google/callback` handles Google redirect

**Outgoing:**
- None defined

---

*Integration audit: 2026-04-11*