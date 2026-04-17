# eat-sheet.com

Multi-tenant SaaS hospitality platform for restaurants. Rebuilt from scratch with focus on quality and exceptional UI.

## Tech Stack

- **Server:** Hono on Cloudflare Workers
- **Client:** React 19 + React Router 7 (SPA mode, no SSR)
- **Design system:** Rialto (`@mattbutlerengineering/rialto`) — CSS Modules, `--rialto-*` tokens, Framer Motion
- **Canvas:** Konva + react-konva (floor plan editor)
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

- `pnpm dev` — Vite dev server (client on :5173, proxies `/api` → :8788)
- `npx wrangler dev --port 8788` — Wrangler dev (must use `--port 8788` to match Vite proxy)
- `pnpm test` — Run all Vitest unit tests
- `pnpm build` — TypeScript check + Vite build
- `pnpm test:e2e` — Playwright E2E tests (onboarding flow + accessibility + Lighthouse)
- `pnpm test:lighthouse` — Lighthouse performance/accessibility audits only
- `pnpm test:coverage` — Vitest with coverage report
- `/deploy` — Skill: test → build → migration check → deploy → verify
- `/new-feature <name>` — Skill: scaffold full feature module (routes/service/repo/types/schema/tests)
- `/create-migration <name>` — Skill: scaffold new D1 migration with sequential numbering
- `/e2e-test <name>` — Skill: scaffold Playwright E2E test with auth cookie + axe-core

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

Rialto 0.1.3+ has correct `exports` paths — no Vite or tsconfig aliases needed. Direct imports work:
- `import { ... } from "@mattbutlerengineering/rialto"`
- `import { spring } from "@mattbutlerengineering/rialto/motion"`
- `import "@mattbutlerengineering/rialto/styles"`

## Testing Patterns

- Tests co-located in `__tests__/` next to source
- Mock D1 with `vi.fn()` returning `prepare/bind/first/run/all`
- Mock R2 with `vi.fn()` returning `put/get/delete/list/head`
- JWT test helper: `sign()` from `hono/jwt` with `HS256`
- Auth tests: create a Hono app with middleware, use `app.request(path, init, env)`
- Route tests: `vi.mock("../repository")` or `vi.mock("../service")` at module boundary, not D1 directly
- Playwright + Konva: canvas elements intercept pointer events — use `force: true` on `canvas.click()`
- E2E tests: Playwright in `e2e/`, JWT cookie injection for auth (no Google OAuth in tests)
- E2E global-setup seeds test user via `wrangler d1 execute --local` (targets Miniflare's D1)
- `@vitest/coverage-v8` must match vitest major version (v2 requires `@vitest/coverage-v8@^2`)
- `execFileSync` without `shell: true` for D1 commands — shell interprets SQL parentheses

## Conventions

- All types use `readonly` for immutability
- Use `nanoid()` for all ID generation
- Domain errors in services, HTTP mapping in routes
- `verify(token, secret, "HS256")` — must pass algorithm explicitly
- Cast JWT verify result: `as unknown as JwtPayload`
- All React hooks MUST be before any early returns — `useCallback`/`useEffect` after `if (loading) return null` crashes in production (React error #310)
- SQLite `TEXT PRIMARY KEY` does NOT auto-generate — always provide `nanoid()` for id columns
- `exactOptionalPropertyTypes` is enabled — use `prop?: string | undefined` to allow passing `undefined` explicitly
- `requirePermission(permission)` middleware in `auth/middleware.ts` — checks `c.var.user.permissions` for string or `"*"`
- Konva `onTap` expects `TouchEvent` — use union `MouseEvent | TouchEvent` when sharing a handler with `onClick`
- PostToolUse hook auto-runs `tsc --noEmit` on `.ts`/`.tsx` edits — don't run manually unless debugging
- PreToolUse hook blocks editing existing migration files — create new migrations instead

## Rialto Frontend Patterns

- `exactOptionalPropertyTypes` requires a cast for Framer Motion styles: `const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;`
- Framer Motion `spring` transition: `import { spring } from "@mattbutlerengineering/rialto/motion"`
- Staggered entrance pattern: parent `motion.div` with `initial="hidden" animate="visible" transition={{ staggerChildren: 0.1 }}`, children use `variants={fadeUp}` where `fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }`
- `fontWeight` with CSS var requires cast: `fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"]`
- Always use Rialto tokens over hardcoded values: `--rialto-space-*` (spacing), `--rialto-text-*` (font size), `--rialto-radius-*` (border radius), `--rialto-tracking-*` (letter spacing), `--rialto-weight-*` (font weight), `--rialto-font-*` (font family), `--rialto-shadow-*` (shadows)
- Every text element needs explicit `fontFamily: "var(--rialto-font-sans, system-ui)"` or `--rialto-font-display` — don't rely on inheritance
- Color selection UI uses double-ring `boxShadow` (gap ring + color ring) instead of `border` to avoid layout shift
- All pages use dark theme: `data-theme="dark"` on outer container
- Rialto Select label is a `<span>`, not `<label>` — clicking it doesn't focus the combobox. `useSelectLabelFocus` hook provides a workaround. Fix upstream: change to `<label htmlFor>` in Rialto source (repo archived)
- Rialto Select without `label` prop renders a combobox with no accessible name — always pass `label` prop

## Floor Plan Editor

- **Canvas:** Konva `<Stage>` + `<Layer>` + `<Transformer>` — renders to `<canvas>`, not DOM (Rialto tokens don't apply inside)
- **Hybrid data model:** `layout_data` JSON blob (spatial x/y/width/height/rotation) + normalized `floor_plan_tables`/`floor_plan_sections` (queryable business data: labels, capacities)
- **Save pattern:** Full-replace PUT — client sends complete state, server diffs and reconciles via `db.batch()`
- **Permissions:** `floor_plans:read` and `floor_plans:write` (already in seed data roles)
- **Routes:** mounted on `/api/t/:tenantId/floor-plans/*` alongside venues
- **Canvas sizing:** `<Stage>` needs explicit pixel dimensions — use `ResizeObserver` on wrapper div
- **Transformer:** normalize `scaleX`/`scaleY` to `width`/`height` on `onTransformEnd` then reset scale to 1
- **Local testing:** apply migrations with `npx wrangler d1 execute eat-sheet-db --local --file=src/server/db/migrations/002_floor_plans.sql`
- **Visual style:** Warm architectural look — wood-toned tables (`#8B7355`), light concrete floor (`#d4cfc8`), dark brown chairs (`#4a3f32`). NOT dark/cold/transparent.
- **Chair rendering:** Rounded rectangles (10x8px) positioned around table perimeter, rotated to face inward — not plain circles
- **Clipboard:** `COPY_TABLE` / `PASTE_TABLE` actions in reducer. Cmd+C/V copies and pastes with 30px offset, Cmd+D duplicates. Skip when input is focused.
- **Walls:** Layout-only (no DB table). Stored in `layout_data` JSON as `WallLayout {id, x1, y1, x2, y2, thickness}`. Two-click placement. Default thickness 6px.
- **Backward compat:** Old `layout_data` may lack `walls` — always use `data.layoutData.walls ?? []`
- **Auto perimeter walls:** New floor plans auto-generate 4 boundary walls via PUT after POST create
- **Drag bounds:** Tables/sections clamped to `0..canvasWidth-elementWidth` on drag end
- **Undo/redo:** History stack (max 50 snapshots of tables/sections/walls/canvasSize). Cmd+Z/Cmd+Shift+Z. Only layout mutations are undoable — zoom/select/tool changes are not.
- **Floor rename:** Double-click tab → inline edit. Calls `PATCH /:tenantId/floor-plans/:planId/name`
- **3D visual techniques:** Wood grain (horizontal `<Line>` for rect, concentric `<Circle>` for round), chair cushions (inner rect), place setting plates, contact shadows (soft halo under furniture), 3D walls (offset polygon for top face)
- **Windows:** `wallType: "window"` on WallLayout (optional, defaults to "wall"). Glass fill with cyan tint + reflection highlight. Thinner (4px) than walls (6px).
- **Templates:** 7 templates in `src/client/features/floor-plan/templates.ts` (Blank, Fine Dining, Casual Bistro, Bar & Lounge, Café, Banquet Hall, Open Kitchen). TemplatePicker modal shown on create. 4 sizes: Cozy/Standard/Spacious/Grand.
- **Template coordinates:** Use fractional positions (0.0–1.0 × canvas size) so layouts fill the room at any size.
- **Konva layers:** Walls + sections + tables must be in the SAME `<Layer>` for `<Transformer>` to attach to any of them. Separate layers break cross-type selection.
- **Section resize:** Sections are resizable via Transformer but `rotateEnabled={selectedType === "table"}` disables rotation for sections (stay axis-aligned).

## Accessibility

- All pages use semantic HTML: `<main id="main-content">`, `<nav aria-label>`, `<h1>`
- Skip-to-content link in App.tsx targets `#main-content`
- Error messages use `role="alert"` for screen reader announcements
- Decorative elements (glows, noise, dividers, SVGs) use `aria-hidden="true"`
- Global `:focus-visible` ring in index.html (2px accent outline)
- ProgressBar uses `role="progressbar"` with `aria-valuenow/min/max`
- Logo fallback letters use `role="img"` + `aria-label`
- axe-core tests in `e2e/accessibility.spec.ts` — WCAG 2.1 AA, fails on critical/serious
- Lighthouse audits in `e2e/lighthouse.spec.ts` — performance, a11y, best practices, SEO
