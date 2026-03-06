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
    expect(body.data.photoUrl).toMatch(/^\/api\/photos\/member-1\/.+\.jpeg$/);
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

  it("rejects file exceeding size limit", async () => {
    const { db } = createMockDb();
    const { bucket } = createMockR2();
    const token = await makeToken();

    // Create a file that reports as > 10MB
    const largeData = new Uint8Array(11 * 1024 * 1024);
    const formData = new FormData();
    formData.append("file", new File([largeData], "huge.jpg", { type: "image/jpeg" }));

    const res = await app.request(
      "/api/photos/upload",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
      env(db, bucket)
    );

    expect(res.status).toBe(413);
    const body: any = await res.json();
    expect(body.error).toBe("File too large. Maximum size is 10MB");
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
