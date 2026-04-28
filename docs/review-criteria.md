# PR Review Criteria

The committed rubric reviewer agents and humans follow when evaluating a PR in eat-sheet.com.

> **Why this exists.** ACMM L3 ("Measured / Enforced") gates on a written-down rubric. This file is that rubric. It's referenced by:
>
> - `.claude/agents/core/reviewer.md`
> - `.claude/agents/core/rialto-reviewer.md`
> - `.claude/agents/core/migration-safety-reviewer.md`
>
> The rubric is intentionally short. Long checklists rot; short rubrics get followed.

## Reviewer's job, in one sentence

**Find the issues that would cost real time if they shipped — bugs, security vulnerabilities, broken contracts — and ignore the rest.**

Style nits (`eslint`) are already enforced by the pre-commit hook. Don't re-litigate them in review.

## Tier 1 — must flag (block on these)

These warrant a `request changes` review. If you find one, name it specifically and quote the line.

1. **Bugs and broken behavior** — Logic errors, off-by-one, mutation where immutability is expected, async/await footguns, wrong type narrowing, dead conditionals.
2. **Security** — Hardcoded secrets, SQL injection vectors, unvalidated user input crossing a trust boundary, missing authorization checks, XSS-prone JSX, runtime evaluation of attacker-controlled strings.
3. **Broken contracts** — API shape changes without a corresponding update to routes/schemas, breaking changes to shared Zod schemas without updating both client and server.
4. **Destructive migrations** — A D1 migration that drops columns/tables, renames without backfill. Check `src/server/db/migrations/` with `migration-safety-reviewer`.
5. **Silent failures** — `try { ... } catch {}`, default-fallback values that mask errors, retry loops without a circuit breaker.
6. **Auth bypasses** — Missing JWT verification, skipping permission checks in `src/server/features/auth/middleware.ts`, unprotected routes that should require `requirePermission()`.

## Tier 2 — should flag (comment, don't block)

Worth raising as `comment` review unless they cluster.

1. **Test gaps** — A new branch in business logic with no test exercising it. New `if`s that change behavior need at least one new assertion.
2. **Type weakness** — `any`, `as unknown as X`, `// @ts-expect-error` without a comment explaining why.
3. **Convention drift** — Pattern that contradicts neighboring code in the same feature module without an explicit reason.
4. **Dead code** — Imports/variables/branches that became unreachable in the diff.
5. **Abstraction without payback** — Helpers used once, factories that wrap a single concrete implementation.
6. **Comment rot** — Comments that no longer describe the code they're attached to.

## Tier 3 — nice to mention, never block

These are preferences, not gates. If you bring them up, mark them `nit:`.

- Naming clarity, refactor opportunities, alternative implementations, "while you're here" cleanups in unrelated files.

## Cross-cutting rules

- **Trust the pre-commit hook.** It runs `eslint` + `tsc --noEmit`. If a PR's tests pass, the *style* is fine — focus on substance.
- **Agent-authored PRs** get the *same* rubric as human PRs. The author field doesn't lower or raise the bar.
- **Surface the why.** "Bug at line 42: `arr[i]` reads past `arr.length` when `i === arr.length`" beats "fix bounds check". Quote the symbol; explain the failure mode.

## Per-area emphasis

| Area | Typical failure modes worth a closer look |
|---|---|
| `src/server/features/*/routes.ts` | Missing auth on a new route, error responses leaking stack traces, request validation gaps (Zod), incorrect D1 transaction boundaries |
| `src/server/features/*/service.ts` | Domain errors not thrown, wrong HTTP mapping in routes, business logic with no test |
| `src/server/features/*/repository.ts` | Raw D1 queries with string interpolation (SQL injection), missing `prepare`/`bind` |
| `src/client/features/*/components/` | Accessibility regressions on interactive elements, Rialto imports bypassed for raw `<input>`, missing `data-theme="dark"` on dark pages |
| `src/shared/schemas/` | Zod schema changes that break both client and server without coordinated update |
| `src/server/db/migrations/` | DROP COLUMN or table without backfill, schema field added without default (breaks existing rows) |
| `wrangler.toml` | Binding changes without updating `src/server/types.ts`, secret references added without updating deploy docs |
| `.github/workflows/` | New workflow with `permissions: write-all` instead of scoped per-job permissions |

## How agents apply this rubric

The `reviewer` agent reads this file at session start. It's expected to:

1. Run `git diff <base>..HEAD` to scope the review.
2. For each file in the diff, identify which Tier 1 categories could plausibly apply and check.
3. Use specialist agents in parallel where appropriate:
   - `migration-safety-reviewer` for changes touching `src/server/db/migrations/`
   - `rialto-reviewer` for changes touching `src/client/features/**/components/`
   - `floor-plan-reviewer` for changes touching `src/shared/templates/floor-plan.ts`
4. Group findings by tier in the review summary. Skip Tier 3 unless asked.
5. End with a verdict: `approve` / `comment` / `request changes`.

## When the rubric is wrong

Update this file. Don't carry implicit knowledge in your head.
