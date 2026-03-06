# Restaurant Enrichment Design

## Problem
Restaurants may have missing address, coordinates, or cuisine data — especially those created before migration 005 or via manual entry without Google Places selection.

## Solution
Server-side enrichment using Google Places Text Search API to backfill missing data.

## Components

### 1. Server: `src/server/routes/enrich.ts`
Admin-only endpoint that finds and enriches restaurants missing location data.

**POST /api/admin/enrich**
- Auth: JWT + `is_admin` check on member
- Accepts: `{ dry_run?: boolean, limit?: number }`
- Queries restaurants where `latitude IS NULL OR longitude IS NULL`
- For each:
  - If `google_place_id` exists → fetch place details directly (GET places/:id)
  - Otherwise → Google Text Search by restaurant name
  - Updates row with: address, latitude, longitude, cuisine (if null), google_place_id
- Returns enrichment summary with per-restaurant status

### 2. Server: Auto-enrich on create in `src/server/routes/restaurants.ts`
After inserting a restaurant without coords, attempt server-side Google Text Search enrichment. Non-blocking — insert first, then try to enrich and update.

### 3. Server: Mount in `src/server/index.ts`
Add `app.route("/api/admin", enrichRoutes)`

### 4. Client: Admin section in `src/client/components/ProfilePage.tsx`
Add "Enrich Restaurants" button for group admins showing:
- Count of restaurants missing data
- Dry-run preview before applying
- Results summary after enrichment

## API Details

### Google Places Text Search
```
POST https://places.googleapis.com/v1/places:searchText
Headers: X-Goog-Api-Key, X-Goog-FieldMask
Body: { textQuery: "restaurant name" }
```
Returns first match with: displayName, formattedAddress, location, types, id

### Enrichment Logic
1. Query: `SELECT id, name, google_place_id FROM restaurants WHERE latitude IS NULL OR longitude IS NULL LIMIT ?`
2. For each restaurant:
   - Has google_place_id? → GET /v1/places/{id} (cheaper, accurate)
   - No google_place_id? → POST searchText with name
3. Update: `UPDATE restaurants SET address=?, latitude=?, longitude=?, cuisine=COALESCE(cuisine,?), google_place_id=? WHERE id=?`
4. COALESCE on cuisine preserves existing values

### Admin Check
Query `members` table for `is_admin = 1` using JWT member_id.

## Files

| File | Action |
|------|--------|
| `src/server/routes/enrich.ts` | Create |
| `src/server/routes/restaurants.ts` | Modify (auto-enrich on POST) |
| `src/server/index.ts` | Modify (mount route) |
| `src/client/components/ProfilePage.tsx` | Modify (admin enrich UI) |

## Cost Estimate
- Text Search: ~$0.032/request
- Place Details: ~$0.017/request
- 50 restaurants = ~$1.60 worst case
