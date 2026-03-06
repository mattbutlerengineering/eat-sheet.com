import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { TEST_SECRET, makeToken, authHeader } from "./helpers/auth";

function env(db: D1Database) {
  return { DB: db, JWT_SECRET: TEST_SECRET };
}

describe("POST /api/restaurants/import", () => {
  it("imports restaurants and returns results", async () => {
    const { db } = createMockDb({
      all: {
        "WHERE google_place_id IN": [],
      },
      first: {
        "INSERT INTO restaurants": { id: "new-1", name: "Pizza Place" },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({
          restaurants: [{ name: "Pizza Place", cuisine: "Italian", google_place_id: "ChIJ123" }],
        }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(0);
    expect(body.data.results).toHaveLength(1);
    expect(body.data.results[0].status).toBe("created");
  });

  it("returns 400 for empty array", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ restaurants: [] }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toMatch(/at least one/i);
  });

  it("returns 400 for non-array", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ restaurants: "not-an-array" }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when exceeding 50 items", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const items = Array.from({ length: 51 }, (_, i) => ({ name: `Place ${i}` }));
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ restaurants: items }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toMatch(/50/);
  });

  it("returns 400 when a restaurant has no name", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({
          restaurants: [{ name: "" }, { name: "Valid Place" }],
        }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it("skips duplicates by google_place_id", async () => {
    const { db } = createMockDb({
      all: {
        "WHERE google_place_id IN": [
          { id: "existing-1", google_place_id: "ChIJdup" },
        ],
      },
      first: {
        "INSERT INTO restaurants": { id: "new-1", name: "New Place" },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({
          restaurants: [
            { name: "Existing Place", google_place_id: "ChIJdup" },
            { name: "New Place", google_place_id: "ChIJnew" },
          ],
        }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(1);
    expect(body.data.results).toHaveLength(2);
    const dup = body.data.results.find((r: any) => r.status === "duplicate");
    expect(dup.name).toBe("Existing Place");
  });

  it("returns 401 without auth", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurants: [{ name: "Test" }] }),
      },
      env(db)
    );
    expect(res.status).toBe(401);
  });

  it("imports items without google_place_id (no dupe check)", async () => {
    const { db } = createMockDb({
      all: {
        "WHERE google_place_id IN": [],
      },
      first: {
        "INSERT INTO restaurants": { id: "new-1", name: "Manual Place" },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/import",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({
          restaurants: [{ name: "Manual Place", address: "123 St" }],
        }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.results[0].status).toBe("created");
  });
});
