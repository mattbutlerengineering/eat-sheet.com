# Contributing to eat-sheet.com

## Branch Model

- `main` — production, protected
- Feature branches: `feat/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, etc.)

## Setup

```bash
pnpm install
pnpm dev        # Vite on :5173, proxies /api → :8788
npx wrangler dev --port 8788  # Worker API
```

## Testing

```bash
pnpm test              # Vitest (unit)
pnpm test:coverage    # Coverage report (thresholds: 70% lines/statements/functions, 60% branches)
pnpm test:e2e         # Playwright (onboarding + a11y + Lighthouse)
pnpm lint             # ESLint (Rialto-only inputs, etc.)
pnpm build            # tsc --noEmit + vite build
```

## Coverage Thresholds

Current thresholds in `vitest.config.ts`:

| Metric    | Threshold |
|-----------|-----------|
| Lines     | 70%       |
| Branches  | 60%       |
| Functions | 70%       |
| Statements| 70%       |

### Raising Thresholds

- Reviewed quarterly (Jan/Apr/Jul/Oct)
- Open a PR that bumps thresholds + includes a coverage trend snapshot
- Thresholds must be based on actual coverage, not aspirational values
- Never lower a threshold once raised

## ACMM

```bash
pnpm acmm        # Run audit, write state + report
pnpm acmm:apply  # + file GitHub issues for gaps
```

See `docs/acmm.md` for the maturity model overview.

## Guardrails

- Never list `github.com/ruvnet` (or associated handles/emails) as a contributor
- See `CLAUDE.md` for full project conventions before coding
