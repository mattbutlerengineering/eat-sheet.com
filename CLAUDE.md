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

## API Response Envelope

```ts
{ ok: true, data: T }              // success
{ ok: false, error: string }       // error
{ ok: true, data: T[], meta: {} }  // paginated
```

## Per-Venue Theming

Venues override Rialto CSS tokens via `VenueThemeProvider`. The `venue_themes` table stores accent/surface colors. Applied to `document.documentElement.style` as `--rialto-accent`, `--rialto-accent-hover`, etc.

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
