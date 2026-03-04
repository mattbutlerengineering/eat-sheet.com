# Photo Uploads Design

## Overview

Add photo upload support for restaurants and reviews using Cloudflare R2 with presigned URLs for direct client-to-R2 uploads.

## Decisions

- **Scope**: Single photo per restaurant, single photo per review
- **Storage**: Cloudflare R2 (`eat-sheet-photos` bucket)
- **Upload pattern**: Presigned URL — client uploads directly to R2, bypassing Worker body limits
- **Client processing**: Resize/compress on client before upload (~800px max, ~200KB target)

## Infrastructure

### R2 Bucket

- Bucket name: `eat-sheet-photos`
- Wrangler binding: `PHOTOS` (R2Bucket)
- Object key pattern: `{family_id}/{uuid}.{ext}`
- Public access enabled for serving images

### Wrangler Config Addition

```toml
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "eat-sheet-photos"
```

## Database Change

```sql
ALTER TABLE reviews ADD COLUMN photo_url TEXT;
```

Restaurants table already has `photo_url TEXT`.

## API

### New: `POST /api/uploads`

- Auth required
- Body: `{ filename: string, contentType: string }`
- Validates content type: jpeg, png, webp, heic
- Generates unique key: `{family_id}/{uuid}.{ext}`
- Returns: `{ uploadUrl: string, photoUrl: string }`

### Modified Endpoints

- `POST /api/restaurants` — already accepts `photo_url` (no change)
- `PUT /api/restaurants/:id` — new endpoint, updates photo_url (and other fields)
- `POST /api/reviews/:restaurantId` — add `photo_url` to accepted body
- `PUT /api/reviews/:id` — add `photo_url` to accepted body

## Client Upload Flow

1. User taps camera button on form
2. File picker opens (image types only)
3. Client resizes/compresses image (canvas API, max 800px, target ~200KB)
4. Client calls `POST /api/uploads` to get presigned URL + final photo URL
5. Client PUTs file directly to R2 via presigned URL
6. Photo preview renders immediately
7. Form submit includes `photo_url` in payload

## UI Locations

- **AddRestaurant**: Camera button below address field, preview after upload
- **RestaurantDetail**: Hero image at top when `photo_url` exists
- **ReviewForm**: Camera button below notes field, preview after upload
- **Review cards**: Thumbnail when review has `photo_url`

## Client Image Handling

- Max input: 5MB before compression
- Resize: max 800px dimension (maintain aspect ratio)
- Output: JPEG at 0.8 quality (~200KB typical)
- HEIC conversion: decode to JPEG on client
- Progress indicator during upload

## File Plan

### New Files

- `src/server/routes/uploads.ts` — presigned URL endpoint
- `src/client/components/PhotoUpload.tsx` — reusable upload component
- `src/client/utils/image.ts` — client-side resize/compress

### Modified Files

- `wrangler.toml` — R2 binding
- `src/server/types.ts` — add PHOTOS to Env
- `src/server/index.ts` — register upload routes
- `src/server/routes/restaurants.ts` — add PUT endpoint
- `src/server/routes/reviews.ts` — accept photo_url
- `src/server/db/schema.sql` — add photo_url to reviews
- `src/client/components/AddRestaurant.tsx` — photo upload UI
- `src/client/components/RestaurantDetail.tsx` — hero image + review thumbnails
- `src/client/components/ReviewForm.tsx` — photo upload UI
- `src/client/types.ts` — add photo_url to Review type
