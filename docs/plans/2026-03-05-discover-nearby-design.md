# Discover Nearby Restaurants

## Problem
The app is light on restaurants. Users need a way to discover and add popular nearby restaurants without manually searching for each one.

## Solution
A new **Discover** tab in the bottom nav that uses Google Places Nearby Search API to show popular restaurants near the user's location, with one-tap adding to the family's list.

## Architecture

### New API Endpoint
`POST /api/places/nearby` — accepts `{ latitude, longitude }`, calls Google Nearby Search API, returns top 20 popular restaurants with name, address, coords, cuisine, rating, and review count.

### New Client Route
`/discover` — new page with geolocation prompt, result cards, and add-to-family flow.

### Components
| Component | Purpose |
|-----------|---------|
| `DiscoverPage.tsx` | Route at `/discover`, geolocation + fetch + state |
| `DiscoverCard.tsx` | Restaurant card with name, cuisine, rating, [+ Add] button |
| `places.ts` (server) | New `POST /nearby` endpoint using Google Nearby Search |
| `BottomNav.tsx` | 5th tab: Discover (compass icon), between Stats and Settings |

### Data Flow
1. Browser geolocation → `POST /api/places/nearby(lat, lng)`
2. Server → Google Nearby Search API (20 results, sorted by popularity)
3. Client cross-references results with family's existing `google_place_id`s
4. Cards show [+ Add] or checkmark for already-added restaurants
5. Tapping [+ Add] → `POST /api/restaurants` (existing endpoint) → card updates to checkmark

### Google Places API
- Endpoint: `POST https://places.googleapis.com/v1/places:searchNearby`
- Field mask: `places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.googleMapsUri`
- Location restriction: 5km radius circle around user coords
- Included types: restaurant, cafe, bar, bakery, meal_takeaway
- Max results: 20

### Cost Controls
- Client-side session cache (no re-fetch on tab switch)
- Single API call per fetch (20 results)
- Manual refresh only (no auto-refresh)

### UI States
- **Loading**: Shimmer placeholder cards
- **Geolocation denied**: Message with instructions to enable
- **API error**: Retry button
- **Empty**: "No restaurants found nearby"
- **Results**: Vertical card list with Add/Added state

### Not Included (YAGNI)
- Cuisine filtering on Discover page
- Radius slider
- Pagination
- Save-for-later / bookmark from Discover
