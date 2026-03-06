---
description: Triage recent Sentry errors with fix suggestions
argument-hint: [project-name]
model: sonnet
---

# Sentry Triage

Fetch and triage recent unresolved Sentry issues for the eat-sheet project.

## Step 1: Fetch Issues

Use the Sentry MCP tools to search for recent unresolved issues.

- If a project name was provided as `$ARGUMENTS`, use that to filter issues
- Otherwise, search across all projects (the eat-sheet project will likely be named "eat-sheet" or similar)
- Focus on **unresolved** issues sorted by most recent
- Fetch up to 20 issues for analysis

If the Sentry MCP server is not connected or authenticated, inform the user to:
1. Restart Claude Code to trigger OAuth flow
2. Or run: `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`

## Step 2: Analyze with Issue Summarizer

Launch the `sentry:issue-summarizer` agent to analyze the fetched issues in parallel. The agent should examine:

- User impact (how many users affected, which flows broken)
- Root causes (common patterns, shared error origins)
- Error grouping (related issues that stem from the same bug)

## Step 3: Map to Codebase

Cross-reference error stack traces and messages with the eat-sheet codebase:

- Server routes: `src/server/routes/` (auth, restaurants, reviews, photos, activity, stats, reactions, bookmarks, share, groups, places, recommendations)
- Client components: `src/client/`
- Database operations: `src/server/db/`
- Auth flows: `src/server/routes/auth.ts`

Use Grep and Read tools to verify the affected code paths exist and identify the specific lines.

## Step 4: Classify Priority

Assign each issue a priority level:

- **P0 — Critical (fix now):** >10 users affected, auth failures, data loss, or complete feature breakage
- **P1 — High (fix soon):** >5 users affected, API 500s on critical paths (restaurant CRUD, reviews, photos)
- **P2 — Medium (plan fix):** <5 users, non-blocking errors, degraded but functional
- **P3 — Low (monitor):** Cosmetic issues, single-occurrence errors, already-mitigated

## Step 5: Output Triage Report

Present results in this format:

```
## Sentry Triage Report

**Project:** [project-name] | **Unresolved:** X issues

### P0 — Critical (fix now)
| Issue | Users | Events | Last Seen | Affected Code | Suggested Fix |
|-------|-------|--------|-----------|---------------|---------------|

### P1 — High (fix soon)
| Issue | Users | Events | Last Seen | Affected Code | Suggested Fix |
|-------|-------|--------|-----------|---------------|---------------|

### P2 — Medium (plan fix)
| Issue | Users | Events | Last Seen | Affected Code | Suggested Fix |
|-------|-------|--------|-----------|---------------|---------------|

### P3 — Low (monitor)
| Issue | Users | Events | Last Seen | Affected Code | Suggested Fix |
|-------|-------|--------|-----------|---------------|---------------|

### Summary
- New issues since [date]: X
- Top affected area: [specific route or component]
- Recommended next action: [specific suggestion with file path]
```

If no issues are found, report a clean bill of health.

## Step 6: Suggest Next Action

Based on the triage, recommend ONE specific next action:
- If P0 issues exist: "Fix [issue] in [file:line] — [brief description]"
- If only P1+: "Prioritize [issue] — affects [N] users on [endpoint]"
- If clean: "No critical issues. Consider checking [area] for proactive improvements."
