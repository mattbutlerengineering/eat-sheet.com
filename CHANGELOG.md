# Changelog

All notable changes to eat-sheet.com are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- ACMM audit harness (`scripts/acmm/`)
- Coverage thresholds in vitest config (70% lines/functions/statements, 60% branches)
- Coverage gate CI workflow
- Baseline governance docs (CONTRIBUTING, CODE_STYLE, AGENTS, SECURITY)

### Changed
- `pnpm acmm`, `pnpm acmm:apply`, `pnpm acmm:badge` scripts added

## [0.1.0] - 2026-04-01

### Added
- Initial release
- Hono + Cloudflare Workers backend
- React 19 + React Router 7 SPA client
- Rialto design system integration
- Floor plan editor (Konva)
- Google OAuth authentication
- D1 database with tenants, venues, floor plans
- Playwright E2E tests + axe-core accessibility
- Sentry error monitoring
