# Eat Sheet — Next Steps

## What's Working

- Full-stack app runs locally (Vite + Wrangler)
- Join flow with invite code `EATSHEET2024` for "The Butlers"
- Add restaurants, leave reviews with 1-10 scores
- PWA manifest and service worker configured
- TypeScript strict mode, clean build

## Local Dev

```bash
# Terminal 1: API
npx wrangler dev

# Terminal 2: Frontend
npm run dev

# Reset local DB (if needed)
npm run db:migrate && npm run db:seed
```

## To Deploy

### 1. Create the D1 database on Cloudflare

```bash
npx wrangler d1 create eat-sheet-db
```

Copy the returned `database_id` into `wrangler.toml` (replace `placeholder-replace-after-creation`).

### 2. Run schema + seed on remote DB

```bash
npx wrangler d1 execute eat-sheet-db --remote --file=src/server/db/schema.sql
npx wrangler d1 execute eat-sheet-db --remote --file=src/server/db/seed.sql
```

### 3. Set production JWT secret

```bash
npx wrangler secret put JWT_SECRET
```

Enter a strong random string when prompted.

### 4. Deploy the Worker (API)

```bash
npx wrangler deploy
```

### 5. Deploy the frontend to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=eat-sheet
```

### 6. Connect eat-sheet.com domain

In Cloudflare dashboard:
- Pages > eat-sheet > Custom domains > Add `eat-sheet.com`
- Make sure the Worker routes are set for `eat-sheet.com/api/*`

## Still TODO

- [ ] **PWA icons** — Replace placeholder files in `public/icons/` with real 192x192 and 512x512 PNGs
- [ ] **Apple touch icon** — Replace `public/apple-touch-icon.png` with a real 180x180 PNG
- [ ] **Invite code management** — Currently hardcoded in seed.sql; add admin API or script to create/rotate codes
- [ ] **Tests** — No test suite yet; add Vitest for unit/integration tests
- [ ] **Photo uploads** — `photo_url` field exists but no upload UI yet (could use Cloudflare R2)
- [ ] **Offline support** — Service worker caches static assets but API calls need offline handling
- [ ] **Delete/archive** — No way to remove restaurants or reviews yet
