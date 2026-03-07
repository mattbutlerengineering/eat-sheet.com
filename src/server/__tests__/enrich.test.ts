import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import {
  TEST_SECRET,
  TEST_MEMBER,
  TEST_MEMBER_2,
  makeToken,
  authHeader,
} from "./helpers/auth";

function env(db: D1Database) {
  return { DB: db, JWT_SECRET: TEST_SECRET, GOOGLE_PLACES_API_KEY: "test-key" };
}

const MISSING_RESTAURANT = {
  id: "rest-missing-1",
  name: "Taco Stand",
  cuisine: null,
  google_place_id: null,
};

const MISSING_WITH_PLACE_ID = {
  id: "rest-missing-2",
  name: "Burger Joint",
  cuisine: "American",
  google_place_id: "ChIJ-existing-id",
};

const GOOGLE_PLACE_RESPONSE = {
  places: [
    {
      id: "ChIJ-new-place-id",
      displayName: { text: "Taco Stand" },
      formattedAddress: "456 Oak Ave, Austin, TX",
      location: { latitude: 30.267, longitude: -97.743 },
      types: ["mexican_restaurant"],
    },
  ],
};

const GOOGLE_DETAIL_RESPONSE = {
  id: "ChIJ-existing-id",
  displayName: { text: "Burger Joint" },
  formattedAddress: "789 Elm St, Austin, TX",
  location: { latitude: 30.268, longitude: -97.744 },
  types: ["american_restaurant"],
};

describe("GET /api/admin/enrich/status", () => {
  it("returns 401 without token", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/admin/enrich/status", {}, env(db));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": null },
    });
    const token = await makeToken({ member_id: TEST_MEMBER_2.id });
    const res = await app.request(
      "/api/admin/enrich/status",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(403);
  });

  it("returns missing count for admin", async () => {
    const { db } = createMockDb({
      first: {
        "is_admin FROM members": { is_admin: 1 },
        "COUNT(*)": { count: 5 },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich/status",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.missing_count).toBe(5);
  });

  it("returns 0 when all restaurants have coords", async () => {
    const { db } = createMockDb({
      first: {
        "is_admin FROM members": { is_admin: 1 },
        "COUNT(*)": { count: 0 },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich/status",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.missing_count).toBe(0);
  });
});

describe("POST /api/admin/enrich", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns 401 without token", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/admin/enrich",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      env(db)
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": null },
    });
    const token = await makeToken({ member_id: TEST_MEMBER_2.id });
    const res = await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      },
      env(db)
    );
    expect(res.status).toBe(403);
  });

  it("returns empty result when no restaurants need enrichment", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": { is_admin: 1 } },
      all: { "FROM restaurants": [] },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.enriched).toBe(0);
    expect(body.data.skipped).toBe(0);
    expect(body.data.failed).toBe(0);
    expect(body.data.details).toHaveLength(0);
  });

  it("enriches restaurant via text search when no google_place_id", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": { is_admin: 1 } },
      all: { "FROM restaurants": [MISSING_RESTAURANT] },
      run: { "UPDATE restaurants": { success: true } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => GOOGLE_PLACE_RESPONSE,
    });
    vi.stubGlobal("fetch", mockFetch);

    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ limit: 10 }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.enriched).toBe(1);
    expect(body.data.details[0].status).toBe("enriched");
    expect(body.data.details[0].address).toBe("456 Oak Ave, Austin, TX");

    // Verify text search was called
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("searchText"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("enriches restaurant via place details when google_place_id exists", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": { is_admin: 1 } },
      all: { "FROM restaurants": [MISSING_WITH_PLACE_ID] },
      run: { "UPDATE restaurants": { success: true } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => GOOGLE_DETAIL_RESPONSE,
    });
    vi.stubGlobal("fetch", mockFetch);

    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.enriched).toBe(1);
    expect(body.data.details[0].address).toBe("789 Elm St, Austin, TX");

    // Verify place detail fetch was called (not searchText)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("ChIJ-existing-id"),
      expect.any(Object)
    );
  });

  it("skips restaurant when no Google match found", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": { is_admin: 1 } },
      all: { "FROM restaurants": [MISSING_RESTAURANT] },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.enriched).toBe(0);
    expect(body.data.skipped).toBe(1);
    expect(body.data.details[0].status).toBe("skipped");
  });

  it("handles API failure gracefully", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": { is_admin: 1 } },
      all: { "FROM restaurants": [MISSING_RESTAURANT] },
    });

    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.failed).toBe(1);
    expect(body.data.details[0].status).toBe("failed");
  });

  it("returns 503 when Google Places API key is not configured", async () => {
    const { db } = createMockDb({
      first: { "is_admin FROM members": { is_admin: 1 } },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      },
      { DB: db, JWT_SECRET: TEST_SECRET } as any
    );
    expect(res.status).toBe(503);
  });

  it("respects limit parameter", async () => {
    const restaurants = Array.from({ length: 5 }, (_, i) => ({
      id: `rest-${i}`,
      name: `Restaurant ${i}`,
      cuisine: null,
      google_place_id: null,
    }));

    const { db, calls } = createMockDb({
      first: { "is_admin FROM members": { is_admin: 1 } },
      all: { "FROM restaurants": restaurants },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => GOOGLE_PLACE_RESPONSE,
    });
    vi.stubGlobal("fetch", mockFetch);

    const token = await makeToken();
    await app.request(
      "/api/admin/enrich",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ limit: 3 }),
      },
      env(db)
    );

    // Verify the SQL query used the limit
    const selectCall = calls.find((c) => c.sql.includes("FROM restaurants"));
    expect(selectCall?.params).toContain(3);
  });
});
