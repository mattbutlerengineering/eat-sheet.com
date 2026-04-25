---
name: bump-dep
description: Bump a single dependency to its latest version, verify with tests + build, and commit. Use when user says "bump X", "pull latest X", "update X to latest", or similar single-dep update phrases.
disable-model-invocation: true
---

# /bump-dep `<package>` — single-dep bump workflow

User-invoked skill that bumps one dependency, runs the verification gates this project uses, and produces the conventional-commit message we've standardised on for chore bumps.

**Argument:** a package name (e.g. `hono`, `@mattbutlerengineering/rialto`, `wrangler`). If no argument is supplied, ask the user which package — do not guess.

## Workflow

### 1. Check current vs. latest

```bash
pnpm view <pkg> version
grep -n "\"<pkg>\"" package.json
```

Show both numbers to the user. Note which side of the existing semver range the latest sits on — that determines step 2.

### 2. Update

- **Latest already satisfies the existing range** (e.g. pin is `^0.1.11`, latest is `0.1.12`) → `pnpm update <pkg>`. The linter normalises the floor in `package.json` automatically.
- **Latest is outside the range** (e.g. pin is `^4.0.0`, latest is `4.12.15`) → edit `package.json` to bump the floor to the new patched minimum (use the *fix* version, not necessarily the latest — e.g. `^4.12.14` if that's where the advisory was patched). Then `pnpm install`.
- **Latest crosses a major boundary** → STOP and confirm with the user before proceeding. Major bumps need their own session and verification budget.

### 3. Verify (both must be green)

```bash
pnpm test --run     # must complete cleanly; report exact count, e.g. "210/210 passed"
pnpm build          # tsc --noEmit + vite build, both clean
```

### 4. If green → commit & push

Use this commit message template (matches recent `chore:` commits on `main`):

```
chore: bump <pkg> to <version>

<one-line on what the bump does — closes Dependabot advisory GHSA-xxxx-xxxx,
follows user request, picks up upstream feature, etc.>. All <N> unit tests
and the production build pass.
```

Stage **only** `package.json` and `pnpm-lock.yaml` (not `git add -A` — see global preference). Then `git push` on the current branch. Do not open a PR unless the user says so.

### 5. If red → stop, do not commit

- Surface the failing test/build output verbatim.
- Don't try to "fix" failures by chasing them — the bump is the suspect; the user decides whether to roll forward, pin a transitive, or revert.
- If lockfile changes muddy the diff, `git checkout -- package.json pnpm-lock.yaml` and `pnpm install` to restore baseline.

## Constraints

- One dependency per invocation. Multi-dep sweeps need their own session.
- pnpm only — never npm, yarn, or bun.
- Don't touch unrelated dependencies even if `pnpm-lock.yaml` shows incidental resolution churn — that's expected and ships with the targeted bump under the same `chore:` prefix.
- Never bypass test/build failures. The bump is not green until both pass.

## Exit conditions

- Commit pushed cleanly → done, report SHA.
- Tests or build failed → report and stop, no commit.
- User cancels at any step → stop.
