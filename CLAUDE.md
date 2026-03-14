# eat-sheet.com — Claude Code Configuration

## Project Context

- **Stack**: Hono (server) + React 19 + Tailwind v4 (client) on Cloudflare Workers/D1/R2
- **Auth**: JWT via hono/jwt, Google OAuth via arctic, invite-code join flow
- **Database**: D1 SQLite — schema at `src/server/db/schema.sql`, migrations in `src/server/db/migrations/`
- **Storage**: R2 bucket `eat-sheet-photos` (binding `PHOTOS`) for review photos
- **Config**: `wrangler.toml` at project root
- **Server routes**: `src/server/routes/{auth,restaurants,reviews,photos,activity,stats,reactions,bookmarks,share,groups,places,recommendations}.ts`
- **Client pages**: React Router 7, code-split via React.lazy in `src/client/`
- **Tests**: Vitest + `app.request()` integration tests with mock helpers in `src/server/__tests__/helpers/`
- **Key tables**: families, members, restaurants, reviews, review_photos, reactions, bookmarks, groups, group_members

### Schema Gotchas

- `reviews.photo_url` was dropped in production — use `review_photos` table instead
- New members get a unique `solo_*` family row to satisfy FK + UNIQUE constraints
- Always verify production column existence before assuming `schema.sql` matches
- D1 enforces foreign keys — every FK reference must point to an existing row

## Behavioral Rules

- Do what has been asked; nothing more, nothing less
- ALWAYS read a file before editing it

## File Organization

- Use `src/server/` for API routes and server logic
- Use `src/client/` for React components and pages
- Use `src/server/db/` for schema and migrations
- Use `src/server/__tests__/` for server tests
- Use `docs/` for documentation
- NEVER save working files or tests to the root folder

## Development Process

For features and multi-file changes, create a GitHub issue first. For single-file fixes, proceed directly.

1. Enter Plan Mode — explore codebase, propose approach with trade-offs, refine with user
2. Execute based on plan size:

| Plan Size | Strategy | Tools |
|-----------|----------|-------|
| Small (1-3 files) | Direct edit | Edit/Write tools, single agent if needed |
| Medium (4-10 files) | Skill-driven | `/gsd:quick` or feature-dev skill, TDD cycle |
| Large (10+ files) | Swarm | Init swarm, spawn parallel agents, wave-based execution |

3. Run `npm test && npm run build` after changes
4. User decides on commit and deploy

## Build, Test & Deploy

```bash
# Local dev
npm run dev              # Vite client (port 5173)
npx wrangler dev         # API server (port 8788)

# Verify
npm test                 # Vitest suite
npm run build            # Production build
npm run lint             # Lint check

# Deploy
npx wrangler deploy      # Cloudflare Workers
```

### Testing Conventions

- Mock D1: `src/server/__tests__/helpers/mock-db.ts` (partial SQL string matching)
- Mock R2: `src/server/__tests__/helpers/mock-r2.ts` (in-memory Map store)
- JWT helper: `src/server/__tests__/helpers/auth.ts` (`makeToken()`, `authHeader()`)
- Write integration tests using `app.request()` with mock bindings

## Execution Rules

- Batch all independent operations in one message
- Use Task tool for agent execution, CLI tools for coordination only
- Spawn agents with `run_in_background: true`
- After spawning agents, STOP — do not poll or check status
- For swarms: hierarchical topology, max 8 agents, specialized strategy
