# Strategic Dashboard

> **ACMM L6 ("Strategist") signal.** The human-in-the-loop views high-level trends (not just per-PR metrics) to steer the system's direction.

## Maturity trend

| Date | ACMM Level | Criteria | Role |
|------|-----------|----------|------|
| 2026-04-27 | L2 (25/85) | Harness ported | Rule-writer |
| 2026-04-27 | L5 (48/85) | Policies + workflows + metrics | Operator |
| *Target* | **L6 (54+/85)** | Orchestration + strategic dash | Strategist |

Run `pnpm acmm` for the live score.

## PR acceptance trend

```
View last 10 windows:
  pnpm exec node scripts/pr-metrics.mjs --print-history
```

Target: **≥70% acceptance rate** sustained over 2 consecutive windows.

## Coverage trend

- **Current:** See `pnpm test:coverage` output
- **Target:** 70% lines/functions/statements, 60% branches (locked in `vitest.config.ts`)
- **Cadence:** Quarterly review (Jan/Apr/Jul/Oct), raise only after baseline established

## Signal quality

| Signal | Current | Target |
|--------|---------|--------|
| CI flake rate (30d) | 0.0% (n=0) | <1% |
| Agent PR outcomes | insufficient data | ≥70% merge rate |
| Agent evals | 0 runs | seed via `node scripts/acmm/evals/index.js` |

## Risk areas (next quarter)

1. **D1 migration safety** — `migration-safety-reviewer` agent coverage
2. **Rialto adoption** — eliminate all raw `<input>` in `src/client/**`
3. **Floor plan editor** — Konva canvas accessibility (keyboard nav, screen reader)
4. **Sentry error rate** — monitor `mattbutlerengineering/eat-sheet` project

## Strategic decisions log

| Date | Decision | Rationale |
|------|-----------|-----------|
| 2026-04-27 | Reached L5 before L6 | L5 self-tuning (metrics + dashboards) is prerequisite to L6 strategist |
| 2026-04-27 | Wave-based dependencies | Prevents agents picking up blocked work |
| 2026-04-27 | GitHub Actions billing intentionally off | Runtime equivalent runs via claude.ai RemoteTriggers |

## How to use this dashboard

1. Review monthly with the user (Matt)
2. Identify which wave has the most open issues → allocate agent cycles there
3. If acceptance rate drops below 70% for 2 windows → open `meta-improvement` issue
4. If ACMM level regresses → `nightly-compliance.yml` should have already filed an issue
