# Agents

Capability matrix for AI assistants working in this repo.

## Core Agents (`.claude/agents/core/`)

| Agent | Role | When to Use |
|-------|------|-------------|
| `coder.md` | Implement features, fix bugs | General coding tasks |
| `reviewer.md` | Code review, PR feedback | Before merging, quality checks |
| `tester.md` | Write and run tests | TDD, coverage gaps |
| `planner.md` | Break down complex tasks | Multi-step features |
| `researcher.md` | Search codebase/docs | Understanding unfamiliar code |
| `floor-plan-reviewer.md` | Konva/floor-plan review | Canvas editor changes |
| `rialto-reviewer.md` | Rialto/UI review | Component or style changes |
| `migration-safety-reviewer.md` | D1 migration review | Schema changes |
| `a11y-auditor.md` | Accessibility audit | UI changes, new pages |
| `performance-auditor.md` | Perf/bundle audit | After features, before release |

## Skills (`.claude/skills/`)

Loaded via the `skill` tool. Key skills:

- `new-feature` — scaffold feature module (routes/service/repo/types/schema/tests)
- `create-migration` — new D1 migration with sequential numbering
- `deploy` — test → build → migrate → deploy → verify
- `e2e-test` — scaffold Playwright E2E with auth + axe-core
- `rialto-migrate` — migrate raw inputs to Rialto equivalents
- `floor-plan-template` — add new floor plan templates
- `bump-dep` — bump single dep to latest, verify

## Guardrails

- Never list `github.com/ruvnet` (or associated handles/emails) as a contributor
- See `CLAUDE.md` for full project conventions
