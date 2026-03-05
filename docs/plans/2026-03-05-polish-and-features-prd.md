# Eat Sheet — Polish & Features PRD

## Overview

Eat Sheet is a family restaurant rating PWA (Hono + React + Cloudflare D1/Workers). The app has core functionality complete: CRUD for restaurants/reviews, JWT auth, photo uploads, offline PWA, visual redesign with Slurms mascot, activity feed, family stats, search/filters, emoji reactions, and enhanced cards.

This PRD covers the next phase: production polish and three new features, organized as 10 milestones suitable for Ralph Loop iteration.

## Tech Stack

- **Server:** Hono on Cloudflare Workers, D1 SQLite, R2 for photos
- **Client:** React 19, React Router 7, Tailwind v4
- **Auth:** JWT with is_admin system
- **PWA:** Vite PWA plugin + Workbox

## Architecture Notes

- Routes: `src/server/routes/{auth,restaurants,reviews,photos,activity,stats,reactions}.ts`
- Components: `src/client/components/*.tsx`
- Hooks: `src/client/hooks/*.ts`
- Utils: `src/client/utils/*.ts`
- Schema: `src/server/db/schema.sql` + migrations in `src/server/db/migrations/`
- Tests: Vitest + Hono `app.request()` + mock D1/R2

---

## Milestone 1: PWA Assets & Install Experience

**Goal:** Make Eat Sheet feel like a real app with proper icons, splash screen, and an install prompt.

### Requirements

1. Generate real PNG icons:
   - `public/icons/icon-192.png` (192x192)
   - `public/icons/icon-512.png` (512x512)
   - `public/apple-touch-icon.png` (180x180)
   - Use the Slurms mascot or the "eat sheet" branding as the icon design
2. Add a themed splash screen via `manifest.webmanifest` background/theme colors
3. Create an `InstallPrompt` component:
   - Listen for `beforeinstallprompt` event
   - Show a dismissable banner: "Add Eat Sheet to your home screen"
   - Persist dismissal in localStorage so it doesn't nag
4. Update `vite.config.ts` PWA manifest to reference the new icons correctly
5. Verify icons render on iOS (apple-touch-icon) and Android (manifest icons)

### Success Criteria

- Lighthouse PWA audit passes with no icon warnings
- Install prompt appears on first visit, respects dismissal
- App icon shows correctly on both iOS and Android home screens

### Tests

- Unit: InstallPrompt component renders/dismisses correctly
- Integration: manifest.webmanifest contains valid icon paths

---

## Milestone 2: Settings & Profile Page

**Goal:** Give users control over their account and family management.

### Requirements

1. Create `GET /api/auth/me` endpoint (if not existing) that returns current member info
2. Create `PUT /api/auth/me` endpoint to update member name
3. Create `SettingsPage` component accessible from header or BottomNav
4. Settings page sections:
   - **Profile:** Display name with edit capability
   - **Family:** Show family name, member count, member list
   - **Admin section** (is_admin only): View/regenerate invite code, remove members
   - **App:** Version info, clear cache button, logout
5. Add a route `/settings` in App.tsx
6. Add a settings icon/link in the header or as a 4th BottomNav tab

### Success Criteria

- Users can view and change their display name
- Admins can view invite code and remove members
- Settings page is accessible from the main navigation

### Tests

- Unit: SettingsPage renders profile, family, admin sections appropriately
- API: PUT /api/auth/me validates input and updates name
- API: Admin-only endpoints reject non-admin members

---

## Milestone 3: Onboarding Flow

**Goal:** Guide new users through their first experience so they immediately understand and engage with the app.

### Requirements

1. Create `OnboardingFlow` component — a 3-step welcome carousel:
   - Step 1: "Welcome to Eat Sheet" — explain the concept (family rates restaurants)
   - Step 2: "Rate honestly" — show how scoring works (1-10, categories)
   - Step 3: "Get started" — prompt to add their first restaurant
2. Show onboarding only for new members (check localStorage flag or review count)
3. After onboarding, navigate to the add restaurant page
4. Improve empty states across the app:
   - Restaurant list: more actionable CTA when empty
   - Activity feed: explain what will appear here
   - Stats: show what stats will look like with sample data
5. Add a "skip" option on every onboarding step

### Success Criteria

- New users see the onboarding flow on first login
- Returning users never see it again
- Empty states guide users toward the next action

### Tests

- Unit: OnboardingFlow renders all steps, skip works, completion sets flag
- Unit: Empty states show appropriate CTAs

---

## Milestone 4: Photo Gallery

**Goal:** Support multiple photos per review with a full-screen viewing experience.

### Requirements

1. Database migration: Create `review_photos` table:
   - `id`, `review_id`, `photo_url`, `caption` (optional), `sort_order`, `created_at`
   - Keep existing `photo_url` on reviews for backward compatibility
2. Update `POST /api/photos/upload` to support multiple uploads
3. Update review create/update endpoints to accept `photo_urls: string[]`
4. Create `PhotoGallery` component:
   - Horizontal scrollable thumbnail strip on review cards
   - Photo count badge (e.g., "3 photos")
5. Create `Lightbox` component:
   - Full-screen overlay with dark background
   - Swipe left/right between photos
   - Pinch-to-zoom support
   - Close button and swipe-down-to-dismiss
6. Update `ReviewForm` to allow adding multiple photos (up to 5)
7. Migrate existing single `photo_url` data to the new table

### Success Criteria

- Users can upload up to 5 photos per review
- Photos display as a scrollable strip on review cards
- Tapping a photo opens a full-screen lightbox with swipe navigation
- Existing single photos continue to display correctly

### Tests

- API: Upload multiple photos, retrieve them in order
- Unit: PhotoGallery renders thumbnails, Lightbox opens/closes/swipes
- Migration: Existing photo_url data migrated correctly

---

## Milestone 5: Image Optimization

**Goal:** Make photo loading fast and smooth, especially on mobile networks.

### Requirements

1. Implement lazy loading for all images:
   - Use `loading="lazy"` on img tags below the fold
   - Use Intersection Observer for gallery thumbnails
2. Generate blur hash placeholders:
   - Compute blur hash on upload (server-side or client-side)
   - Store hash in the photo record
   - Display as placeholder while full image loads
3. Client-side compression improvements:
   - Resize to max 1200px before upload (currently may not have a limit)
   - Target 80% JPEG quality
   - Show compression progress indicator
4. Responsive images:
   - Generate thumbnail (300px) and full (1200px) variants on upload via R2
   - Use `srcset` to serve appropriate size
5. Add skeleton shimmer placeholders for images while loading

### Success Criteria

- Images load progressively with blur placeholders
- No layout shift when images load (fixed aspect ratios)
- Upload size reduced by 50%+ through compression
- Lighthouse performance score 90+

### Tests

- Unit: Blur placeholder renders and transitions to full image
- Integration: Upload generates thumbnail + full variants
- Performance: Measure before/after load times

---

## Milestone 6: Accessibility & Performance Audit

**Goal:** Ensure the app is usable by everyone and performs well on low-end devices.

### Requirements

1. Semantic HTML audit:
   - Replace generic divs with `<main>`, `<article>`, `<section>`, `<nav>` where appropriate
   - Add proper heading hierarchy (h1 > h2 > h3)
   - Ensure all interactive elements are `<button>` or `<a>`, not clickable divs
2. ARIA labels:
   - Label all icon-only buttons (close, delete, back, reactions)
   - Add `aria-live` regions for dynamic content (loading states, errors)
   - Score sliders need `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
3. Keyboard navigation:
   - All interactive elements focusable and operable via keyboard
   - Visible focus indicators (not just browser default)
   - Escape closes modals/lightbox
   - Tab order follows visual order
4. Color contrast:
   - Verify all text meets WCAG AA (4.5:1 for normal text, 3:1 for large)
   - Fix any stone-500-on-stone-950 contrast issues
5. Performance:
   - Code split routes with React.lazy
   - Preload critical fonts
   - Minimize bundle size — check for unused dependencies

### Success Criteria

- Lighthouse accessibility score 90+
- Lighthouse performance score 90+
- All interactive elements keyboard accessible
- Screen reader can navigate the full app flow

### Tests

- Automated accessibility audit (axe-core or similar)
- Keyboard-only navigation test for critical flows
- Lighthouse CI check

---

## Milestone 7: "Want to Try" List

**Goal:** Let users bookmark restaurants they haven't visited yet as a wishlist.

### Requirements

1. Database migration: Add `bookmarks` table:
   - `id`, `member_id`, `restaurant_id`, `created_at`
   - UNIQUE(member_id, restaurant_id)
2. API endpoints:
   - `POST /api/bookmarks/:restaurantId` — toggle bookmark
   - `GET /api/bookmarks` — list bookmarked restaurants for current member
3. UI: Bookmark button on restaurant detail page:
   - Bookmark icon (outline when not saved, filled when saved)
   - Animate on toggle
4. UI: "Want to Try" section:
   - Either a separate tab in BottomNav or a toggle/section on the restaurant list
   - Show bookmarked restaurants with a "Visited? Rate it!" CTA
   - When user adds a review, automatically remove the bookmark
5. Show bookmark count on restaurant cards (e.g., "2 people want to try this")

### Success Criteria

- Users can bookmark/unbookmark restaurants
- Bookmarked restaurants appear in a dedicated "Want to Try" view
- Adding a review to a bookmarked restaurant removes the bookmark
- Bookmark state persists across sessions

### Tests

- API: Toggle bookmark on/off, list bookmarks
- API: Bookmark auto-removed when review added
- Unit: Bookmark button toggles state, "Want to Try" list renders

---

## Milestone 8: Map View

**Goal:** Visualize restaurants on a map with score-colored markers.

### Requirements

1. Database migration: Add `latitude` and `longitude` columns to `restaurants` table (nullable REAL)
2. Update restaurant create/update endpoints to accept lat/lng
3. Geocoding on restaurant creation:
   - If address provided, use a free geocoding API (Nominatim/OpenStreetMap) to get coordinates
   - Store coordinates in the database
   - Fall back gracefully if geocoding fails — restaurant still saves without coords
4. Create `MapView` component:
   - Use Leaflet.js with OpenStreetMap tiles (free, no API key needed)
   - Plot restaurants as markers colored by score (red < 4, amber 4-7, green 7+)
   - Marker popup shows restaurant name, score, cuisine
   - Tap popup to navigate to restaurant detail
5. Add map as a view toggle on the restaurant list (list/map toggle button)
6. Center map on user's location (with permission) or on the average of all restaurant coordinates
7. Backfill: Run geocoding for existing restaurants with addresses

### Success Criteria

- Restaurants with coordinates appear on the map
- Markers are color-coded by score
- Tapping a marker shows restaurant info and links to detail
- Map centers on user location or restaurant cluster
- Restaurants without coordinates still work (just don't appear on map)

### Tests

- API: Create restaurant with coordinates, retrieve them
- Unit: MapView renders markers, popup content is correct
- Integration: Geocoding service called when address provided
- Edge case: Restaurant without address/coordinates handled gracefully

---

## Milestone 9: Share Links

**Goal:** Let users share restaurants and reviews with people outside the family.

### Requirements

1. Create public share routes (no auth required):
   - `GET /api/share/restaurant/:id` — returns restaurant name, score, cuisine, review count (no member names)
   - `GET /api/share/review/:id` — returns review score, notes, photo (no member name)
2. Database migration: Add `share_token` column to restaurants and reviews:
   - Generated on first share, reused thereafter
   - Random hex string, used in public URLs
3. Create `SharePage` component:
   - Public page at `/share/:token`
   - Displays restaurant/review info with Eat Sheet branding
   - "Join Eat Sheet" CTA at the bottom
4. Add OG meta tags for shared links:
   - `og:title`, `og:description`, `og:image` (restaurant photo or Slurms fallback)
   - Twitter card meta tags
5. Share button on restaurant detail:
   - Uses Web Share API if available (native share sheet)
   - Falls back to copy-to-clipboard with toast notification
   - Generates the share link on first use
6. Share button on individual reviews (same pattern)

### Success Criteria

- Share button generates a public URL
- Public URL displays restaurant/review info without exposing family data
- OG meta tags render previews in messaging apps
- Native share sheet works on mobile

### Tests

- API: Generate share token, retrieve public data
- API: Public endpoint returns no member names
- Unit: ShareButton uses Web Share API or clipboard fallback
- Unit: SharePage renders restaurant/review info
- Integration: OG meta tags present in HTML response

---

## Milestone 10: Final QA & Hardening

**Goal:** Catch edge cases, add error boundaries, and verify everything works end-to-end.

### Requirements

1. Add React Error Boundary:
   - Wrap route components in an ErrorBoundary
   - Show friendly error screen with Slurms and retry button
   - Log errors to console (or Sentry if configured)
2. Edge case handling:
   - Very long restaurant names (truncation)
   - Very long review notes (scroll or expand)
   - Rapid-fire reactions (debounce)
   - Concurrent review edits (last-write-wins with warning)
   - Network timeout handling with retry
3. E2E tests (Playwright):
   - Join family flow
   - Add restaurant
   - Add review with photo
   - View restaurant detail
   - Use search and filters
   - React to a review
   - Bookmark a restaurant
   - View map
   - Share a restaurant
   - Settings / change name
4. Load testing:
   - Verify app handles 100+ restaurants without performance degradation
   - Verify stats endpoint handles 1000+ reviews
5. Deploy verification:
   - Run full E2E suite against production after deploy
   - Verify all migrations applied on production D1
   - Verify R2 photos accessible

### Success Criteria

- Error boundaries catch and display all unhandled errors
- E2E tests pass for all critical user flows
- No console errors during normal usage
- App performs well with 100+ restaurants

### Tests

- E2E: Full Playwright test suite covering all flows
- Performance: Lighthouse scores 90+ across all categories
- Error boundary: Verify error UI renders on thrown errors
