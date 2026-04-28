# Observability Runbook

> **ACMM L6 ("Strategist") signal.** The system has a documented runbook for debugging production issues — not just alerts, but the **diagnostic playbook** agents follow when something breaks.

## Quick links

| Service | Link |
|---------|------|
| Sentry (errors) | https://cloud.sentry.io/mattbutlerengineering/eat-sheet/ |
| Eat-sheet.com (prod) | https://eat-sheet.com/ |
| Cloudflare Workers dashboard | https://dash.cloudflare.com/workers/ |
| D1 database (prod) | `npx wrangler d1 list --remote` |

## Severity levels

| Level | Response | Example |
|-------|----------|---------|
| **P0 — Critical** | Page Matt immediately, rollback if safe | DB down, auth broken, data loss |
| **P1 — High** | Fix within 4 hours | Sentry error spike, floor plan editor broken |
| **P2 — Medium** | Fix within 24 hours | Slow query, Rialto styling regression |
| **P3 — Low** | Backlog, fix in normal cycle | Typo, unused import |

## Diagnostic playbook

### P0: Site is down / Workers returning 500

1. Check Cloudflare Workers status: https://dash.cloudflare.com/workers/
2. Check Sentry for error spike: `curl -s "https://cloud.sentry.io/api/0/projects/mattbutlerengineering/eat-sheet/events/" -H "Authorization: Bearer $SENTRY_TOKEN"`
3. Check D1: `npx wrangler d1 execute eat-sheet-db --remote --command "SELECT 1"`
4. Check secrets: `npx wrangler secret list` (verify SENTRY_DSN, JWT_SECRET present)
5. **Rollback:** `npx wrangler rollback eat-sheet --message "P0 rollback"`

### P1: Sentry error spike (non-critical path)

1. Open Sentry issue, read stack trace
2. Identify if error is in:
   - **Client** (`src/client/`): Open issue with label `area:client`
   - **Server** (`src/server/`): Open issue with label `area:server`
   - **D1** (database): Label `area:database`, assign `migration-safety-reviewer`
3. Run `pnpm acmm` to check if a governance regression caused it
4. Open `meta-improvement` issue if the same error type appears >3 times in 24h

### P2: Performance regression (Lighthouse drop)

1. Run `pnpm test:lighthouse` locally
2. Check bundle size: `npx vite build --mode analysis`
3. Check for accidental heavy imports in `src/client/`
4. Open issue with label `performance`

### P3: Coverage drop, lint warnings

1. Run `pnpm test:coverage` — identify uncovered files
2. Run `pnpm lint` — fix or disable with reason
3. If agent-caused: open `meta-improvement` issue

## Common failure modes

| Symptom | Likely Cause | Fix |
|----------|-------------|-----|
| `JWT_SECRET` missing | Secret not set in Cloudflare | `npx wrangler secret put JWT_SECRET` |
| D1 `no such table` | Migration not applied to prod | `npx wrangler d1 migrations apply eat-sheet-db --remote` |
| Rialto styles missing | `styles` import forgotten | Add `import "@mattbutlerengineering/rialto/styles"` to `main.tsx` |
| Floor plan canvas blank | `data-theme="dark"` missing | Add to outer container in page component |
| Konva transformer not showing | Table + walls in different `<Layer>`s | Move to same `<Layer>` |

## Agent self-healing protocol

When Sentry receives an error with stack trace pointing to a file the agent recently modified:

1. Agent opens an issue: `[ci-fix] Fix <error-type> in <file>`
2. Agent assigns itself, transitions to `in-progress`
3. Agent writes a test that reproduces the error
4. Agent fixes the code, opens PR with `Closes #N`
5. Human reviews (or auto-merges if `tier:trivial`)

## Escalation contacts

| Role | Who | When |
|------|------|------|
| Technical | Matt (repo owner) | P0, P1, security issues |
| Billing | Matt | Sentry quota, Cloudflare usage, GitHub Actions |
| Domain/DNS | Matt | eat-sheet.com SSL, Cloudflare settings |

## Why this is L6

At L6, the system doesn't just detect errors — it has a **runbook for recovering from them**. The observability stack (Sentry + Cloudflare + D1) plus this document form a complete diagnostic system that agents can follow without human hand-holding.
