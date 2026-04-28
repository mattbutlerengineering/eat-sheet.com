# Copilot Instructions

You are an AI assistant helping with the eat-sheet.com codebase. Follow these rules:

## Project Overview

Multi-tenant SaaS hospitality platform for restaurants. Hono on Cloudflare Workers, React 19 + React Router 7 SPA, Rialto design system.

## Guardrails

- Never list `github.com/ruvnet` (or any handle/email associated with that user) as a co-author or contributor on commits in this repo.
- Never commit secrets (.env, credentials.json). Warn the user if they request it.
- Never force-push to main/master without explicit user request.

## Code Conventions

- Forms: `react-hook-form` + `@hookform/resolvers/zod` with shared Zod schemas
- Rialto components only in `src/client/**` — no raw `<input>`, `<select>`, `<textarea>`
- Types use `readonly`; `exactOptionalPropertyTypes` enabled
- `nanoid()` for all ID generation
- Domain errors in services, HTTP mapping in routes
- Co-located tests in `__tests__/` next to source

## Layer Rules

| Layer | Can Import | Never Imports |
|-------|-----------|---------------|
| Route | Schema, Service, Types | D1 directly |
| Service | Repository, Types | Hono req/res, D1 |
| Repository | D1, Types | Business rules, HTTP |

## Commands

- `pnpm dev` — Vite dev server
- `pnpm test` — Vitest
- `pnpm build` — tsc + vite build
- `pnpm lint` — ESLint
- `pnpm acmm` — ACMM audit

## Rialto Patterns

- Dark theme: `data-theme="dark"` on container
- `Input.error` is `boolean`, not `string`
- Import from `@mattbutlerengineering/rialto` (no aliases needed)
- Use `--rialto-*` tokens, not hardcoded values
