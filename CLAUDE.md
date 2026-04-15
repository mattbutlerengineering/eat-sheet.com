# eat-sheet.com

Multi-tenant SaaS hospitality platform for restaurants. Rebuilt from scratch with focus on quality and exceptional UI.

## Tech Stack

- **Server:** Hono on Cloudflare Workers
- **Client:** React 19 + React Router 7 (SPA mode, no SSR)
- **Design system:** Rialto (`@mattbutlerengineering/rialto`) — CSS Modules, `--rialto-*` tokens, Framer Motion
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (`eat-sheet-logos` bucket)
- **Auth:** Google OAuth via Arctic + JWT via hono/jwt
- **Validation:** Zod (shared client + server)
- **Tests:** Vitest
- **Package manager:** pnpm

## Project Structure

```
src/
  server/
    features/{name}/      # Feature modules
      routes.ts           # HTTP boundary
      service.ts          # Business logic
      repository.ts       # D1 queries
      schema.ts           # Zod validation
      types.ts            # TypeScript types
      __tests__/          # Co-located tests
    db/                   # Schema + migrations
    errors.ts             # Domain error classes
    response.ts           # API response helpers
    types.ts              # Server env types
    index.ts              # Hono app entry
  client/
    features/{name}/      # Feature modules
      components/         # React components
      hooks/              # Custom hooks
      index.ts            # Barrel export
    api/                  # API client
    providers/            # Context providers
    pages/                # Route-level pages
    App.tsx               # Router + providers
    main.tsx              # Entry point
  shared/
    schemas/              # Zod schemas (client + server)
    types/                # Shared TypeScript types
```

## Layer Rules

| Layer | Can Import | Never Imports |
|-------|-----------|---------------|
| Route | Schema, Service, Types | D1 directly |
| Service | Repository, Types | Hono req/res, D1 |
| Repository | D1, Types | Business rules, HTTP |
| Schema | Zod, Types | Everything else |

## Commands

- `pnpm dev` — Vite dev server (client)
- `pnpm dev:api` — Wrangler dev (server on :8788)
- `pnpm test` — Run all tests
- `pnpm run build` — TypeScript check + Vite build
- `pnpm db:migrate` — Run D1 migrations locally
- `pnpm db:seed` — Seed system roles

## Deployment

- `pnpm build && npx wrangler deploy` — Build client + deploy Worker + assets
- Worker name: `eat-sheet`, routes: `eat-sheet.com/*`, `www.eat-sheet.com/*`
- Secrets (set via `wrangler secret put`): `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SENTRY_DSN`
- D1 schema: `npx wrangler d1 execute eat-sheet-db --remote --file=src/server/db/schema.sql`
- D1 seed: `npx wrangler d1 execute eat-sheet-db --remote --file=src/server/db/seed.sql`
- Google OAuth redirect URI must match: `https://eat-sheet.com/api/auth/callback`
- `index.html` includes a script to unregister stale v1 service workers — do not remove it

## Monitoring

- Sentry (free tier): `@sentry/react` (client, main.tsx) + `@sentry/cloudflare` (server, withSentry wrapper)
- Sentry project: `mattbutlerengineering/eat-sheet` on us.sentry.io

## Workers + Assets Routing

- `[assets]` in `wrangler.toml` with `not_found_handling = "single-page-application"` intercepts ALL paths (including `/api/*`) BEFORE the Worker runs — never use it with a Worker that has API routes
- Instead: set `not_found_handling = "none"` and `binding = "ASSETS"`, then handle SPA fallback in the Hono app via a catch-all `app.get("*")` that serves `index.html` through `c.env.ASSETS.fetch()`
- The `ASSETS` binding must be declared in `Bindings` type as `ASSETS: Fetcher`

## API Response Envelope

```ts
{ ok: true, data: T }              // success
{ ok: false, error: string }       // error
{ ok: true, data: T[], meta: {} }  // paginated
```

## Per-Venue Theming

Venues override Rialto CSS tokens via `VenueThemeProvider`. The `venue_themes` table stores accent/surface colors. Applied to `document.documentElement.style` as `--rialto-accent`, `--rialto-accent-hover`, etc.

## Rialto Dark Theme

- Pages with dark backgrounds MUST set `data-theme="dark"` on their container to activate Rialto's dark token set
- Without it, labels use light-theme colors (`--rialto-input-label-text: #6b6660`) which are invisible on dark backgrounds

## Rialto Import Aliases

The published Rialto package has incorrect `exports` paths. Vite aliases in `vite.config.ts` redirect all three entry points to `dist/lib/`:
- `@mattbutlerengineering/rialto` → `dist/lib/rialto.js`
- `@mattbutlerengineering/rialto/motion` → `dist/lib/motion.js`
- `@mattbutlerengineering/rialto/styles` → `dist/lib/styles.css`

TypeScript path aliases in `tsconfig.json` point to the corresponding `.d.ts` files.

## Testing Patterns

- Tests co-located in `__tests__/` next to source
- Mock D1 with `vi.fn()` returning `prepare/bind/first/run/all`
- Mock R2 with `vi.fn()` returning `put/get/delete/list/head`
- JWT test helper: `sign()` from `hono/jwt` with `HS256`
- Auth tests: create a Hono app with middleware, use `app.request(path, init, env)`

## Conventions

- All types use `readonly` for immutability
- Use `nanoid()` for all ID generation
- Domain errors in services, HTTP mapping in routes
- `verify(token, secret, "HS256")` — must pass algorithm explicitly
- Cast JWT verify result: `as unknown as JwtPayload`
- All React hooks MUST be before any early returns — `useCallback`/`useEffect` after `if (loading) return null` crashes in production (React error #310)
- SQLite `TEXT PRIMARY KEY` does NOT auto-generate — always provide `nanoid()` for id columns
- `exactOptionalPropertyTypes` is enabled — use `prop?: string | undefined` to allow passing `undefined` explicitly

## Rialto Frontend Patterns

- `exactOptionalPropertyTypes` requires a cast for Framer Motion styles: `const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;`
- Framer Motion `spring` transition: `import { spring } from "@mattbutlerengineering/rialto/motion"`
- Staggered entrance pattern: parent `motion.div` with `initial="hidden" animate="visible" transition={{ staggerChildren: 0.1 }}`, children use `variants={fadeUp}` where `fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }`
- `fontWeight` with CSS var requires cast: `fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"]`
- Always use Rialto tokens over hardcoded values: `--rialto-space-*` (spacing), `--rialto-text-*` (font size), `--rialto-radius-*` (border radius), `--rialto-tracking-*` (letter spacing), `--rialto-weight-*` (font weight), `--rialto-font-*` (font family), `--rialto-shadow-*` (shadows)
- Every text element needs explicit `fontFamily: "var(--rialto-font-sans, system-ui)"` or `--rialto-font-display` — don't rely on inheritance
- Color selection UI uses double-ring `boxShadow` (gap ring + color ring) instead of `border` to avoid layout shift
- All pages use dark theme: `data-theme="dark"` on outer container
