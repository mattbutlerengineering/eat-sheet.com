# Multi-Agent Orchestration

> **ACMM L6 ("Strategist") signal.** The system has 10+ agents with a documented orchestration pattern describing how they coordinate on complex tasks.

## Agent inventory (`.claude/agents/core/`)

| Agent | Role | Trigger |
|-------|------|---------|
| `coder.md` | Implement features, fix bugs | Default coding tasks |
| `reviewer.md` | Code review, PR feedback | Before merging |
| `tester.md` | Write and run tests | TDD, coverage gaps |
| `planner.md` | Break down complex tasks | Multi-step features |
| `researcher.md` | Search codebase/docs | Understanding unfamiliar code |
| `floor-plan-reviewer.md` | Konva/floor-plan review | Canvas editor changes |
| `rialto-reviewer.md` | Rialto/UI review | Component or style changes |
| `migration-safety-reviewer.md` | D1 migration review | Schema changes |
| `a11y-auditor.md` | Accessibility audit | UI changes, new pages |
| `performance-auditor.md` | Perf/bundle audit | After features, before release |

## Orchestration pattern

### Task → Issue → Agent dispatch

1. **Human or meta-improvement issue** identifies a task
2. **Planner agent** breaks it into sequenced issues (wave-1 → wave-2 → wave-3)
3. **Researcher agent** gathers context, updates issue body with findings
4. **Coder agent** picks up `ready` issue, transitions to `in-progress`, opens PR with `Closes #N`
5. **Reviewer agents** (specialist + code-reviewer) review the PR based on `docs/review-criteria.md`
6. **Human** gives final approval on `tier:critical` and `tier:sensitive` PRs
7. **Merge** → **Deploy** (via `/deploy` skill or `pnpm build && wrangler deploy`)

### Wave-based dependency model

Tasks are grouped into **waves** (dependency tiers):

| Wave | Depends On | Example |
|------|------------|---------|
| **Wave 1** (Prerequisites) | Nothing | Audit harness, coverage gate, governance docs |
| **Wave 2** (Operations) | Wave 1 | SECURITY-AI.md, policy-as-code, workflows |
| **Wave 3** (Intelligence) | Wave 2 | Metrics endpoint, reflection log, dashboards |

An agent working on Wave N must not be blocked by uncompleted Wave N-1 work.

### Specialist routing (tier-classifier → agent selection)

The `tier-classifier.yml` workflow (or human reviewer) assigns a `tier:` label. Specialist agents are invoked based on path patterns:

| Path pattern | Specialist agent |
|-------------|-----------------|
| `src/server/db/migrations/` | `migration-safety-reviewer` |
| `src/client/features/**/components/` | `rialto-reviewer` |
| `src/shared/templates/floor-plan.ts` | `floor-plan-reviewer` |
| `src/**` (accessibility changes) | `a11y-auditor` |
| `src/**` (perf-sensitive changes) | `performance-auditor` |

### Self-tuning loop (L5 → L6)

```
codebase state → ACMM audit → gap issues (auto-issue.yml)
                        ↓
              nightly-compliance.yml (drift detection)
                        ↓
              meta-improvement issues (process regressions)
                        ↓
              planner → researcher → coder → reviewer → merge
```

The loop measures its own acceptance rate (`scripts/pr-metrics.mjs`) and adjusts thresholds in `.github/auto-qa-tuning.json`.

## Human escalation

The user (Matt) is always in the loop for:
- `tier:critical` PR approval
- Secret rotation
- Production deploys (via explicit approval)
- Any action requiring `sudo` or `rm -rf /`

## Agent → Agent handoff protocol

When specialist review is needed:
1. Reviewer agent comments with specialist mention: `@migration-safety-reviewer please review D1 changes`
2. Specialist agent picks up the comment, runs analysis, reports findings
3. Original reviewer agent consolidates all findings into a single review verdict

## Why this file exists

Without an orchestration doc, the system is a bag of agents. With it, they form a **self-tuning loop** — the defining property of ACMM L6.
