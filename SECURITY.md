# Security Policy

## Reporting a Vulnerability

Email: **security@mattbutlerengineering.com**

We aim to respond within **72 hours** and will coordinate a fix + disclosure timeline with you.

## Scope

- `eat-sheet.com` web application and API
- Cloudflare Worker (`eat-sheet`) and D1 database
- R2 storage (`eat-sheet-logos` bucket)
- Sentry error tracking configuration

## Out of Scope

- Third-party services (Google OAuth, Sentry) — report to their programs
- Social engineering, physical attacks
- DoS on `eat-sheet.com`

## Disclosure Process

1. Reporter emails disclosure address
2. We confirm receipt within 72h
3. We investigate and develop a fix
4. We coordinate a release date with reporter
5. We publish a security advisory on GitHub after the fix is deployed

## CVE Process

If the vulnerability qualifies, we will:
- Request a CVE from GitHub Security Advisories
- Include the CVE in the release notes
- Credit the reporter (unless they wish to remain anonymous)

## Sentry

We use Sentry (`@sentry/react` + `@sentry/cloudflare`) for error monitoring.
- Sentry project: `mattbutlerengineering/eat-sheet` on us.sentry.io
- DSN configured via `SENTRY_DSN` secret in Cloudflare Workers
- No PII is sent to Sentry (user IDs only, no emails or names)
