# Photo Uploads Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add photo upload support for restaurants and reviews using Cloudflare R2 with a Worker-proxied upload endpoint and direct R2 serving.

**Architecture:** Client compresses images to ~200KB via canvas, uploads to a Hono endpoint that stores in R2 via binding, and receives a photo URL. Photos are served publicly from a separate no-auth GET route. The `photo_url` field (already in restaurants) is added to reviews.

**Tech Stack:** Hono, Cloudflare R2 (Worker binding), React 19, Canvas API for image compression, Vitest

---

### Task 1: Infrastructure — R2 Binding + Env Types

**Files:**
- Modify: `wrangler.toml`
- Modify: `src/server/types.ts:50-53`

**Step 1: Add R2 binding to wrangler.toml**

Add after the `[[d1_databases]]` block:

```toml
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "eat-sheet-photos"
```

**Step 2: Add PHOTOS to Env type**

In `src/server/types.ts`, update the `Env` interface:

```ts
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  PHOTOS: R2Bucket;
}
```

**Step 3: Commit**

```bash
git add wrangler.toml src/server/types.ts
git commit -m "feat: add R2 bucket binding for photo uploads"
```

---

### Task 2: R2 Mock Test Helper

**Files:**
- Create: `src/server/__tests__/helpers/mock-r2.ts`

**Step 1: Create the R2 mock**

This mock mirrors the pattern used in `mock-db.ts` — it captures calls for assertion and returns configured responses.

```ts
import { vi } from "vitest";

export function createMockR2() {
  const store = new Map<string, { body: ArrayBuffer; contentType: string }>();

  const bucket = {
    put: vi.fn(async (key: string, body: ReadableStream | ArrayBuffer | null, options?: { httpMetadata?: { contentType?: string } }) => {
      const contentType = options?.httpMetadata?.contentType ?? "application/octet-stream";
      // Store a dummy buffer for testing
      store.set(key, { body: new ArrayBuffer(0), contentType });
    }),
    get: vi.fn(async (key: string) => {
      const item = store.get(key);
      if (!item) return null;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(item.body));
            controller.close();
          },
        }),
        httpMetadata: { contentType: item.contentType },
      };
    }),
  };

  return { bucket: bucket as unknown as R2Bucket, store };
}
```

**Step 2: Commit**

```bash
git add src/server/__tests__/helpers/mock-r2.ts
git commit -m "test: add R2 bucket mock helper"
```

---

### Task 3: Photo Upload Endpoint (TDD)

**Files:**
- Create: `src/server/routes/photos.ts`
- Modify: `src/server/index.ts`
- Create: `src/server/__tests__/photos.test.ts`

**Step 1: Write the failing tests**

Create `src/server/__tests__/photos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { createMockR2 } from "./helpers/mock-r2";
import { TEST_SECRET, makeToken, authHeader } from "./helpers/auth";

function env(db: D1Database, photos: R2Bucket) {
  return { DB: db, JWT_SECRET: TEST_SECRET, PHOTOS: photos };
}

describe("POST /api/photos/upload", () => {
  it("uploads a file and returns photo URL", async () => {
    const { db } = createMockDb();
    const { bucket } = createMockR2();
    const token = await makeToken();

    const formData = new FormData();
    formData.append("file", new File(["fake-image-data"], "photo.jpg", { type: "image/jpeg" }));

    const res = await app.request(
      "/api/photos/upload",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
      env(db, bucket)
    );

    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.photoUrl).toMatch(/^\/api\/photos\/family-1\/.+\.jpeg$/);
    expect(bucket.put).toHaveBeenCalledOnce();
  });

  it("rejects missing file", async () => {
    const { db } = createMockDb();
    const { bucket } = createMockR2();
    const token = await makeToken();

    const res = await app.request(
      "/api/photos/upload",
      {
        method: "POST",
        headers: { ...authHeader(token) },
      },
      env(db, bucket)
    );

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe("No file provided");
  });

  it("rejects invalid content type", async () => {
    const { db } = createMockDb();
    const { bucket } = createMockR2();
    const token = await makeToken();

    const formData = new FormData();
    formData.append("file", new File(["data"], "doc.pdf", { type: "application/pdf" }));

    const res = await app.request(
      "/api/photos/upload",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
      env(db, bucket)
    );

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe("Invalid file type. Allowed: jpeg, png, webp");
  });

  it("requires authentication", async () => {
    const { db } = createMockDb();
    const { bucket } = createMockR2();

    const res = await app.request(
      "/api/photos/upload",
      { method: "POST" },
      env(db, bucket)
    );

    expect(res.status).toBe(401);
  });
});

describe("GET /api/photos/:familyId/:filename", () => {
  it("serves a stored photo", async () => {
    const { db } = createMockDb();
    const { bucket, store } = createMockR2();
    store.set("family-1/abc.jpeg", {
      body: new ArrayBuffer(4),
      contentType: "image/jpeg",
    });

    const res = await app.request(
      "/api/photos/family-1/abc.jpeg",
      {},
      env(db, bucket)
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("returns 404 for missing photo", async () => {
    const { db } = createMockDb();
    const { bucket } = createMockR2();

    const res = await app.request(
      "/api/photos/family-1/missing.jpeg",
      {},
      env(db, bucket)
    );

    expect(res.status).toBe(404);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/__tests__/photos.test.ts`
Expected: FAIL — module `../routes/photos` does not exist

**Step 3: Implement the photo routes**

Create `src/server/routes/photos.ts`:

```ts
import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const photos = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

// Upload — auth required
photos.post("/upload", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp" }, 400);
  }

  const ext = EXT_MAP[file.type] ?? "jpeg";
  const key = `${payload.family_id}/${crypto.randomUUID()}.${ext}`;

  await c.env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ data: { photoUrl: `/api/photos/${key}` } }, 201);
});

// Serve — no auth (photos are semi-public, keys are unguessable UUIDs)
photos.get("/:familyId/:filename", async (c) => {
  const key = `${c.req.param("familyId")}/${c.req.param("filename")}`;
  const object = await c.env.PHOTOS.get(key);

  if (!object) {
    return c.json({ error: "Photo not found" }, 404);
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export { photos as photoRoutes };
```

**Step 4: Register routes in index.ts**

In `src/server/index.ts`, add the import and route:

```ts
import { photoRoutes } from "./routes/photos";
```

Add after the existing routes:

```ts
app.route("/api/photos", photoRoutes);
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/server/__tests__/photos.test.ts`
Expected: PASS (6 tests)

**Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All 41 tests pass (35 existing + 6 new)

**Step 7: Commit**

```bash
git add src/server/routes/photos.ts src/server/__tests__/photos.test.ts src/server/__tests__/helpers/mock-r2.ts src/server/index.ts
git commit -m "feat: add photo upload and serving endpoints with R2"
```

---

### Task 4: DB Schema + Types for Review Photos

**Files:**
- Modify: `src/server/db/schema.sql:28-42`
- Modify: `src/server/types.ts:28-40` (server)
- Modify: `src/client/types.ts:20-34` (client)
- Modify: `src/server/__tests__/helpers/auth.ts:39-52`

**Step 1: Add photo_url to reviews table in schema**

In `src/server/db/schema.sql`, add `photo_url TEXT,` after the `notes TEXT,` line in the reviews table:

```sql
  notes TEXT,
  photo_url TEXT,
  visited_at TEXT,
```

**Step 2: Add photo_url to server Review type**

In `src/server/types.ts`, add to the Review interface after `notes`:

```ts
  readonly photo_url: string | null;
```

**Step 3: Add photo_url to client Review type**

In `src/client/types.ts`, add to the Review interface after `notes`:

```ts
  readonly photo_url: string | null;
```

**Step 4: Update test fixture**

In `src/server/__tests__/helpers/auth.ts`, add `photo_url: null` to `TEST_REVIEW` after `notes`:

```ts
  notes: "Great pizza",
  photo_url: null,
  visited_at: "2026-01-10",
```

**Step 5: Commit**

```bash
git add src/server/db/schema.sql src/server/types.ts src/client/types.ts src/server/__tests__/helpers/auth.ts
git commit -m "feat: add photo_url column to reviews schema and types"
```

---

### Task 5: Reviews Routes — Accept photo_url (TDD)

**Files:**
- Modify: `src/server/routes/reviews.ts:12-66` (POST) and `71-117` (PUT)
- Modify: `src/server/__tests__/reviews.test.ts`

**Step 1: Write failing tests for photo_url in create/update**

Add to `src/server/__tests__/reviews.test.ts`, inside the existing describe blocks or as new ones:

```ts
// Add to the POST describe block:
it("creates a review with photo_url", async () => {
  const { db } = createMockDb({
    first: {
      "FROM restaurants": { id: "rest-1" },
      "FROM reviews WHERE restaurant_id": null,
      "INSERT INTO reviews": {
        ...TEST_REVIEW,
        photo_url: "/api/photos/family-1/abc.jpeg",
      },
    },
  });
  const token = await makeToken();
  const res = await app.request(
    "/api/reviews/rest-1",
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({
        overall_score: 8,
        photo_url: "/api/photos/family-1/abc.jpeg",
      }),
    },
    env(db)
  );
  expect(res.status).toBe(201);
  const body: any = await res.json();
  expect(body.data.photo_url).toBe("/api/photos/family-1/abc.jpeg");
});

// Add to the PUT describe block:
it("updates a review with photo_url", async () => {
  const { db } = createMockDb({
    first: {
      "SELECT id FROM reviews": { id: "review-1" },
      "UPDATE reviews": {
        ...TEST_REVIEW,
        photo_url: "/api/photos/family-1/xyz.jpeg",
      },
    },
  });
  const token = await makeToken();
  const res = await app.request(
    "/api/reviews/review-1",
    {
      method: "PUT",
      headers: authHeader(token),
      body: JSON.stringify({
        overall_score: 9,
        photo_url: "/api/photos/family-1/xyz.jpeg",
      }),
    },
    env(db)
  );
  expect(res.status).toBe(200);
  const body: any = await res.json();
  expect(body.data.photo_url).toBe("/api/photos/family-1/xyz.jpeg");
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/__tests__/reviews.test.ts`
Expected: FAIL — photo_url not included in INSERT/UPDATE

**Step 3: Update reviews.ts POST to accept photo_url**

In `src/server/routes/reviews.ts`, update the POST handler body type to include:

```ts
    photo_url?: string;
```

Update the INSERT SQL to include photo_url (add after `notes`):

```sql
INSERT INTO reviews (restaurant_id, member_id, overall_score, food_score, service_score, ambiance_score, value_score, notes, photo_url, visited_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

Add the bind parameter after `body.notes?.trim() || null`:

```ts
      body.photo_url?.trim() || null,
```

**Step 4: Update reviews.ts PUT to accept photo_url**

In the PUT handler body type, add:

```ts
    photo_url?: string | null;
```

Update the UPDATE SQL to include photo_url:

```sql
UPDATE reviews
SET overall_score = ?, food_score = ?, service_score = ?, ambiance_score = ?, value_score = ?, notes = ?, photo_url = ?, visited_at = ?, updated_at = datetime('now')
WHERE id = ? AND member_id = ?
```

Add the bind parameter after `body.notes?.trim() || null`:

```ts
      body.photo_url?.trim() || null,
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/server/__tests__/reviews.test.ts`
Expected: PASS

**Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/server/routes/reviews.ts src/server/__tests__/reviews.test.ts
git commit -m "feat: accept photo_url in review create and update"
```

---

### Task 6: Restaurant PUT Endpoint (TDD)

**Files:**
- Modify: `src/server/routes/restaurants.ts`
- Modify: `src/server/__tests__/restaurants.test.ts`

**Step 1: Write failing tests**

Add to `src/server/__tests__/restaurants.test.ts`:

```ts
describe("PUT /api/restaurants/:id", () => {
  it("updates a restaurant", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT id FROM restaurants": { id: "rest-1" },
        "UPDATE restaurants": {
          ...TEST_RESTAURANT,
          name: "Updated Name",
          photo_url: "/api/photos/family-1/new.jpeg",
        },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/rest-1",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({
          name: "Updated Name",
          cuisine: "Italian",
          address: "123 Main St",
          photo_url: "/api/photos/family-1/new.jpeg",
        }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.name).toBe("Updated Name");
    expect(body.data.photo_url).toBe("/api/photos/family-1/new.jpeg");
  });

  it("returns 400 if name is missing", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/rest-1",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ cuisine: "Italian" }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent restaurant", async () => {
    const { db } = createMockDb({
      first: { "SELECT id FROM restaurants": null },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/nope",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ name: "Test" }),
      },
      env(db)
    );
    expect(res.status).toBe(404);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/__tests__/restaurants.test.ts`
Expected: FAIL — PUT route does not exist (405 or 404)

**Step 3: Implement PUT endpoint**

Add to `src/server/routes/restaurants.ts` before the `delete` handler:

```ts
restaurants.put("/:id", async (c) => {
  const payload = c.get("jwtPayload");
  const id = c.req.param("id");
  const body = await c.req.json<{
    name: string;
    cuisine?: string;
    address?: string;
    photo_url?: string;
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Restaurant name is required" }, 400);
  }

  const db = c.env.DB;
  const existing = await db
    .prepare("SELECT id FROM restaurants WHERE id = ? AND family_id = ?")
    .bind(id, payload.family_id)
    .first();

  if (!existing) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  const restaurant = await db
    .prepare(
      `UPDATE restaurants
       SET name = ?, cuisine = ?, address = ?, photo_url = ?
       WHERE id = ? AND family_id = ?
       RETURNING *`
    )
    .bind(
      body.name.trim(),
      body.cuisine?.trim() || null,
      body.address?.trim() || null,
      body.photo_url?.trim() || null,
      id,
      payload.family_id
    )
    .first();

  return c.json({ data: restaurant });
});
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/__tests__/restaurants.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/server/routes/restaurants.ts src/server/__tests__/restaurants.test.ts
git commit -m "feat: add PUT endpoint for updating restaurants"
```

---

### Task 7: Client Image Compression Utility

**Files:**
- Create: `src/client/utils/image.ts`

**Step 1: Create the image compression utility**

Create `src/client/utils/image.ts`:

```ts
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class ImageTooLargeError extends Error {
  constructor() {
    super("Image must be under 5MB");
    this.name = "ImageTooLargeError";
  }
}

export function compressImage(file: File): Promise<Blob> {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new ImageTooLargeError());
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}
```

**Step 2: Commit**

```bash
git add src/client/utils/image.ts
git commit -m "feat: add client-side image compression utility"
```

---

### Task 8: PhotoUpload Component

**Files:**
- Create: `src/client/components/PhotoUpload.tsx`

**Step 1: Create the PhotoUpload component**

Create `src/client/components/PhotoUpload.tsx`:

```tsx
import { useState, useRef, type ChangeEvent } from "react";
import { compressImage, ImageTooLargeError } from "../utils/image";

interface PhotoUploadProps {
  readonly token: string;
  readonly onUploaded: (url: string | null) => void;
  readonly existingUrl?: string | null;
}

export function PhotoUpload({ token, onUploaded, existingUrl }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const compressed = await compressImage(file);

      const formData = new FormData();
      formData.append("file", compressed, "photo.jpg");

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Upload failed");
      }

      setPreview(json.data.photoUrl);
      onUploaded(json.data.photoUrl);
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploaded(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFile}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-48 object-cover rounded-xl border border-stone-700"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-8 h-8 bg-stone-900/80 hover:bg-red-600 text-stone-300 hover:text-white rounded-full flex items-center justify-center transition-colors text-sm"
          >
            X
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 border-2 border-dashed border-stone-700 hover:border-orange-500/50 rounded-xl text-stone-400 hover:text-stone-300 transition-colors disabled:opacity-40"
        >
          {uploading ? "Uploading..." : "Add Photo"}
        </button>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/client/components/PhotoUpload.tsx
git commit -m "feat: add reusable PhotoUpload component"
```

---

### Task 9: Integrate PhotoUpload in AddRestaurant

**Files:**
- Modify: `src/client/components/AddRestaurant.tsx`

**Step 1: Add photo upload to the form**

Import the component:

```ts
import { PhotoUpload } from "./PhotoUpload";
```

Add state for photo URL (after the existing `useState` calls):

```ts
const [photoUrl, setPhotoUrl] = useState<string | null>(null);
```

Add `photo_url` to the POST body in `handleSubmit` (after `address`):

```ts
photo_url: photoUrl ?? undefined,
```

Add the PhotoUpload component in the JSX, after the address field `<div>` block and before the error display:

```tsx
<PhotoUpload token={token} onUploaded={setPhotoUrl} />
```

**Step 2: Verify visually**

Run: `npm run dev`
Navigate to Add Restaurant. Confirm the photo upload button appears below the address field.

**Step 3: Commit**

```bash
git add src/client/components/AddRestaurant.tsx
git commit -m "feat: add photo upload to AddRestaurant form"
```

---

### Task 10: Integrate PhotoUpload in ReviewForm

**Files:**
- Modify: `src/client/components/ReviewForm.tsx`

**Step 1: Add photo_url to ReviewData**

Update the `ReviewData` interface to include:

```ts
  readonly photo_url: string | null;
```

**Step 2: Add photo state and pass to onSubmit**

Import `PhotoUpload`:

```ts
import { PhotoUpload } from "./PhotoUpload";
```

The `ReviewForm` needs the `token` prop. Update `ReviewFormProps`:

```ts
interface ReviewFormProps {
  readonly token: string;
  readonly existingReview?: Review;
  readonly onSubmit: (data: ReviewData) => Promise<void>;
  readonly onCancel: () => void;
}
```

Add state (after existing `useState` calls):

```ts
const [photoUrl, setPhotoUrl] = useState<string | null>(existingReview?.photo_url ?? null);
```

Add `photo_url: photoUrl` to the `onSubmit` data object.

Add the PhotoUpload component after the notes textarea and before the error display:

```tsx
<PhotoUpload token={token} onUploaded={setPhotoUrl} existingUrl={existingReview?.photo_url} />
```

**Step 3: Update ReviewForm call site in RestaurantDetail.tsx**

In `src/client/components/RestaurantDetail.tsx`, pass `token` to `ReviewForm`:

```tsx
<ReviewForm
  token={token}
  existingReview={myReview}
  onSubmit={handleSubmitReview}
  onCancel={() => setShowForm(false)}
/>
```

Also update `handleSubmitReview` to pass `photo_url` through:

The `handleSubmitReview` function already forwards the full `data` object to `post`/`put`, so `photo_url` will be included automatically as long as `ReviewData` has it.

**Step 4: Verify visually**

Run: `npm run dev`
Navigate to a restaurant detail, click Add Review. Confirm the photo upload button appears.

**Step 5: Commit**

```bash
git add src/client/components/ReviewForm.tsx src/client/components/RestaurantDetail.tsx
git commit -m "feat: add photo upload to review form"
```

---

### Task 11: Display Photos in RestaurantDetail

**Files:**
- Modify: `src/client/components/RestaurantDetail.tsx`

**Step 1: Add hero image for restaurant**

In `RestaurantDetail.tsx`, add a hero image block right after the `<header>` closing tag and before `<div className="px-4 max-w-lg mx-auto">`:

```tsx
{restaurant.photo_url && (
  <div className="w-full max-h-64 overflow-hidden">
    <img
      src={restaurant.photo_url}
      alt={restaurant.name}
      className="w-full h-64 object-cover"
    />
  </div>
)}
```

**Step 2: Add thumbnails to review cards**

In each review card, add a photo below the notes block (before the delete review section):

```tsx
{review.photo_url && (
  <img
    src={review.photo_url}
    alt="Review photo"
    className="mt-3 w-full h-40 object-cover rounded-lg border border-stone-800/50"
  />
)}
```

**Step 3: Verify visually**

Run: `npm run dev`
If there are restaurants/reviews with photos, confirm they display. Test adding a photo and seeing the preview.

**Step 4: Commit**

```bash
git add src/client/components/RestaurantDetail.tsx
git commit -m "feat: display restaurant hero and review photos"
```

---

### Task 12: Display Photo Thumbnails in Restaurant List

**Files:**
- Modify: `src/client/components/RestaurantList.tsx`

**Step 1: Add thumbnail to restaurant cards**

In the restaurant list cards, if `photo_url` exists, show a small thumbnail. Check the current RestaurantList component structure and add an image element next to or above the restaurant name.

Read `src/client/components/RestaurantList.tsx` to determine exact placement, then add:

```tsx
{restaurant.photo_url && (
  <img
    src={restaurant.photo_url}
    alt=""
    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
  />
)}
```

Place this in the card layout so it sits beside the restaurant name as a small avatar-style thumbnail.

**Step 2: Verify visually**

Run: `npm run dev`
Confirm thumbnails appear on restaurant cards that have photos.

**Step 3: Commit**

```bash
git add src/client/components/RestaurantList.tsx
git commit -m "feat: show photo thumbnails in restaurant list"
```

---

### Task 13: Run Full Test Suite + Final Verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (35 existing + new upload/review/restaurant tests)

**Step 2: Manual E2E smoke test**

Run: `npm run dev` and `npx wrangler dev` in parallel.

Test flow:
1. Navigate to Add Restaurant
2. Fill in name, upload a photo
3. Submit — see restaurant with hero image
4. Add a review with a photo
5. Confirm review shows thumbnail
6. Go back to list — confirm restaurant shows thumbnail

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues from photo upload smoke test"
```
