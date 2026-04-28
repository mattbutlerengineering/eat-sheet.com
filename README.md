# eat-sheet.com

<!-- acmm:begin -->
![ACMM Level 6 — Fully Autonomous](https://img.shields.io/badge/ACMM%20Level%206%20%E2%80%94%20Fully%20Autonomous-5319e7?style=flat-square)
<!-- acmm:end -->

Multi-tenant SaaS hospitality platform for restaurants — reservations, waitlist, floor plans, and guest management. Built on Cloudflare Workers + React 19.

## Tech stack

- **Server**: Hono on Cloudflare Workers
- **Client**: React 19 + React Router 7 (SPA, no SSR)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (logos)
- **Auth**: Google OAuth via Arctic + JWT
- **Design system**: [Rialto](https://www.npmjs.com/package/@mattbutlerengineering/rialto)
- **Canvas**: Konva + react-konva (floor plan editor)
- **Tests**: Vitest (unit) + Playwright (E2E + Lighthouse)
- **Package manager**: pnpm

## Quick start

```bash
# 1. Install
pnpm install

# 2. Local secrets
cp .dev.vars.example .dev.vars
# fill in JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

# 3. Local D1 database
npx wrangler d1 execute eat-sheet-db --local --file=src/server/db/schema.sql
npx wrangler d1 execute eat-sheet-db --local --file=src/server/db/seed.sql

# 4. Run both dev servers (in two terminals)
pnpm dev                          # Vite client on :5173, proxies /api -> :8788
npx wrangler dev --port 8788      # Hono Worker on :8788
```

Open http://localhost:5173.

## Common commands

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Vite dev server (client) |
| `npx wrangler dev --port 8788` | Wrangler dev (server) |
| `pnpm test` | Vitest unit tests |
| `pnpm test:coverage` | Vitest with coverage |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm test:lighthouse` | Lighthouse audits only |
| `pnpm build` | `tsc --noEmit` + `vite build` |
| `pnpm build && npx wrangler deploy` | Deploy to production |

## Deploying

Deploys are manual (`pnpm build && npx wrangler deploy`). Production secrets live in Cloudflare:

```bash
wrangler secret put JWT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI
wrangler secret put SENTRY_DSN
```

The production Google OAuth redirect URI must be `https://eat-sheet.com/api/auth/callback`.

## Project layout

```
src/server/   Hono routes, services, repos, D1 schema + migrations
src/client/   React app — features, pages, providers, API client
src/shared/   Zod schemas + types shared between client and server
e2e/          Playwright tests (incl. axe-core a11y, Lighthouse)
.claude/      Claude Code config (skills, agents, hooks)
```

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, conventions, and design-system rules. The roadmap and phase plans live under `.planning/` and on the [GitHub issues](https://github.com/mattbutlerengineering/eat-sheet.com/issues) board.

## License

Private / unlicensed.
