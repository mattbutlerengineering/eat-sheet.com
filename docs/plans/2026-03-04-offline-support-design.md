# Offline Support Design

## Overview

Add offline-first data caching so the app shows previously-loaded restaurants and reviews when offline. Uses Workbox runtime caching via vite-plugin-pwa.

## Current State

- `vite-plugin-pwa` with `registerType: "autoUpdate"` and Workbox
- Precaches static assets (app shell loads offline)
- No runtime caching for `/api/*` calls — shows empty data offline
- No offline indicator in UI

## Design

### Strategy: Stale-While-Revalidate for API reads

**API GET requests** (`/api/restaurants`, `/api/restaurants/:id`):
- Serve from cache immediately (fast), revalidate from network in background
- Cache expiration: 24 hours, max 50 entries
- User sees cached data instantly, fresh data appears on next navigation

**API mutations** (POST/PUT/DELETE):
- Network-only (no caching)
- Show clear error when offline: "You're offline. Changes will need to wait."

**Photo serving** (`/api/photos/*`):
- Cache-first strategy (photos are immutable, URLs contain UUIDs)
- Cache expiration: 30 days, max 200 entries

### Implementation

Add `workbox` runtime caching config to `vite-plugin-pwa` in `vite.config.ts`:

```ts
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^\/api\/restaurants/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "api-restaurants",
          expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
        },
      },
      {
        urlPattern: /^\/api\/photos\//,
        handler: "CacheFirst",
        options: {
          cacheName: "api-photos",
          expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
        },
      },
    ],
  },
})
```

### Offline UI Indicator

- Small banner at top when `navigator.onLine === false`
- "You're offline — showing cached data"
- Auto-dismiss when back online
- Component: `src/client/components/OfflineBanner.tsx`
- Mount in `App.tsx` above the router

### Files

- Modify: `vite.config.ts` — add workbox runtimeCaching
- Create: `src/client/components/OfflineBanner.tsx` — offline indicator
- Modify: `src/client/App.tsx` — mount OfflineBanner

### What We're NOT Building (YAGNI)

- Background sync for offline mutations (complex, low value for family app)
- IndexedDB local database (Workbox cache is sufficient)
- Conflict resolution (single-family app, low contention)
- Offline photo uploads with queue (can wait for connection)
