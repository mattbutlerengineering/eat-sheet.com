---
name: deploy
description: Build and deploy eat-sheet.com to Cloudflare Workers. Runs tests, builds, applies pending migrations, and deploys.
disable-model-invocation: true
---

# Deploy

Build and deploy eat-sheet.com to production.

## Steps

1. Run tests: `pnpm test -- --run`
2. Build: `pnpm build`
3. Check for unapplied migrations:
   ```bash
   ls src/server/db/migrations/*.sql
   ```
   Ask user if any new migrations need `npx wrangler d1 execute eat-sheet-db --remote --file=<path>` before deploying.
4. Deploy: `npx wrangler deploy`
5. Verify: `curl -s https://eat-sheet.com/api/health`

## Important

- Never deploy if tests fail
- Never deploy if build fails
- Always confirm migration status with user before applying to production
- Report the deployed version ID from wrangler output
