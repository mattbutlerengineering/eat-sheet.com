# Code Style

Full conventions in `CLAUDE.md` (canonical reference). This file is a quick-lookup supplement.

## Lint & Format

- **ESLint**: `pnpm lint` — enforces Rialto-only form elements in `src/client/**`
- **TypeScript**: strict flags enabled in `tsconfig.json`
- **No formatter enforced** — match surrounding style (2-space indent, semicolons, single quotes)

## Key Rules

### React
- Hooks before early returns (React error #310)
- `readonly` on all types
- `exactOptionalPropertyTypes` — use `prop?: T | undefined`

### Imports
- Rialto: direct (no aliases needed in vite/tsconfig for v0.1.3+)
- Feature modules: barrel via `index.ts`
- Server layers: Route → Service → Repository (never skip)

### Forms
- `react-hook-form` + `@hookform/resolvers/zod`
- Rialto `Input.error` is `boolean`, not `string`
- `mode: "onTouched"`, sync parent via `watch()`

### Tests
- Co-located in `__tests__/` next to source
- Mock at module boundary (`vi.mock("../repository")`), not D1 directly
- `exactOptionalPropertyTypes` + Zod `.partial()` → cast `parsed.data as { ... }`

### Commit Messages
- [Conventional Commits](https://www.conventionalcommits.org/)
- `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`
