# Technology Stack

**Analysis Date:** 2026-04-11

## Languages

**Primary:**
- TypeScript 5.9.3 - API server (Hono) and React client

**Secondary:**
- JavaScript (ES2022) - Transpiled via Vite for client

## Runtime

**Environment:**
- Cloudflare Workers - Server runtime (Edge execution)
- Node.js 22.x - Build and dev tools only

**Package Manager:**
- npm (Node.js built-in)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Hono 4.12.12 - API server framework
- React 19.2.4 - Client UI framework
- React Router DOM 7.13.1 - Client routing

**Testing:**
- Vitest 4.0.18 - Unit/integration tests
- Playwright 1.58.2 - E2E tests
- jsdom 28.1.0 - Test DOM environment

**Build/Dev:**
- Vite 7.3.2 - Build tool and dev server
- Wrangler 4.73.0 - Cloudflare Workers CLI
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- @vitejs/plugin-react 5.1.4 - React JSX transformation
- Vite PWA 1.2.0 - Progressive Web App generation

## Key Dependencies

**Critical:**
- hono/jwt 4.12.12 - JWT signing/verification
- hono/cors 4.12.12 - CORS middleware
- hono/factory 4.12.12 - Custom middleware factory
- arctic 3.7.0 - Google OAuth 2 (PKCE)
- zod 4.3.6 - Schema validation

**Infrastructure:**
- @sentry/cloudflare 10.42.0 - Error tracking (server)
- @sentry/react 10.42.0 - Error tracking (client)
- @cloudflare/workers-types 4.20260305.0 - D1/R2 type definitions

**UI/Data:**
- leaflet 1.9.4 - Maps library (client-side)
- @json-render/react 0.16.0 - JSON tree renderer
- posthog-js 1.359.1 - Analytics (configured but not actively imported in codebase)
- web-vitals 5.1.0 - Core web vitals

## Configuration

**Environment:**
- `.env` file at project root for local dev (contains env vars)
- wrangler.toml for Cloudflare bindings:
  - D1 database: `eat-sheet-db` (binding `DB`)
  - R2 bucket: `eat-sheet-photos` (binding `PHOTOS`)
- Environment variables via Cloudflare:
  - `JWT_SECRET`
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `OAUTH_REDIRECT_BASE`
  - `SENTRY_DSN`

**Build:**
- `tsconfig.json` - TypeScript config with ES2022 target, strict mode
- `tsconfig.json` for paths: `@server/*`, `@client/*`, `@features/*`
- `vite.config.ts` - Vite config with React, Tailwind, PWA plugins
- `vitest.config.ts` - Test config with coverage
- `wrangler.toml` - Worker config with D1/R2 bindings, routes

## Platform Requirements

**Development:**
- Node.js 22.x+
- Cloudflare Workers compatible code (no Node.js APIs)
- D1 SQLite for local dev (`npm run db:migrate`, `npm run db:seed`)

**Production:**
- Cloudflare Workers (paid plan for D1/R2)
- D1 SQLite database
- R2 bucket for photo storage

---

*Stack analysis: 2026-04-11*