# Sentry Triage Command Design

**Date:** 2026-03-06
**Type:** Developer tooling (Claude Code slash command)

## Goal

Create a `/sentry-triage` command that fetches recent unresolved Sentry issues for the eat-sheet project, analyzes them with the issue-summarizer agent, and produces a prioritized triage report with fix suggestions mapped to codebase locations.

## Command

**File:** `.claude/commands/sentry-triage.md`

### Frontmatter

```yaml
description: Triage recent Sentry errors with fix suggestions
argument-hint: [project-name]
model: sonnet
```

- Optional `project-name` argument defaults to eat-sheet project
- Uses sonnet for balanced reasoning/speed
- No tool restrictions (needs Sentry MCP + agent access)

### Flow

1. **Fetch** — Use Sentry MCP tools to query recent unresolved issues
2. **Analyze** — Delegate to `issue-summarizer` agent for parallel analysis of user impact, root causes, and patterns
3. **Map to code** — Cross-reference error stack traces with project paths (`src/server/routes/`, `src/client/`)
4. **Report** — Output prioritized triage table

### Output Format

```
## Sentry Triage Report

**Project:** eat-sheet | **Period:** Last 24h | **Unresolved:** X issues

### P0 — Critical (fix now)
| Issue | Users | Events | Suggested Fix |
|-------|-------|--------|---------------|
| ...   | ...   | ...    | ...           |

### P1 — High (fix soon)
...

### P2 — Medium (plan fix)
...

### P3 — Low (monitor)
...

### Summary
- X new issues since last check
- Top affected area: [route/component]
- Recommended next action: [specific suggestion]
```

### Priority Classification

- **P0:** >10 users affected OR auth/data-loss errors
- **P1:** >5 users OR API 500s on critical paths
- **P2:** <5 users, non-blocking errors
- **P3:** Cosmetic, low-frequency, or already-mitigated

## Implementation

Single file: `.claude/commands/sentry-triage.md`

The command prompt instructs Claude to:
1. Parse optional project-name argument (default: auto-detect from Sentry)
2. Use Sentry MCP to fetch unresolved issues
3. Launch issue-summarizer agent for deep analysis
4. Map errors to eat-sheet codebase paths
5. Classify by priority
6. Output structured triage report
7. Suggest specific next action

## Dependencies

- Sentry MCP server (configured via `claude mcp add`)
- Sentry plugin's `issue-summarizer` agent
- OAuth authentication with Sentry (first-run browser flow)
