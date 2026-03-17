import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { TEST_SECRET, makeToken, authHeader } from "./helpers/auth";

function createApp(db: D1Database) {
  return {
    async fetch(req: Request) {
      return app.fetch(req, {
        DB: db,
        JWT_SECRET: TEST_SECRET,
        PHOTOS: {} as R2Bucket,
      });
    },
  };
}

const MOCK_REVIEW = {
  id: "rv-1",
  restaurant_id: "rest-1",
  restaurant_name: "Pizza Place",
  overall_score: 8,
  food_score: 9,
  service_score: 7,
  ambiance_score: 8,
  value_score: 7,
  notes: 'Great "pizza"',
  visited_at: "2026-01-10",
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
};

describe("GET /api/export", () => {
  it("requires authentication", async () => {
    const { db } = createMockDb();
    const { fetch } = createApp(db);

    const res = await fetch(new Request("http://localhost/api/export"));
    expect(res.status).toBe(401);
  });

  it("returns JSON export by default", async () => {
    const { db } = createMockDb({
      all: {
        "FROM restaurants r": [{ id: "rest-1", name: "Pizza Place", cuisine: "Italian" }],
        "FROM reviews rv": [MOCK_REVIEW],
        "FROM bookmarks b": [{ restaurant_id: "rest-1", restaurant_name: "Pizza Place" }],
      },
    });

    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/export", { headers: authHeader(token) })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { restaurants: unknown[]; my_reviews: unknown[]; my_bookmarks: unknown[] } };
    expect(body.data.restaurants).toHaveLength(1);
    expect(body.data.my_reviews).toHaveLength(1);
    expect(body.data.my_bookmarks).toHaveLength(1);
  });

  it("returns CSV when format=csv", async () => {
    const { db } = createMockDb({
      all: {
        "FROM restaurants r": [],
        "FROM reviews rv": [MOCK_REVIEW],
        "FROM bookmarks b": [],
      },
    });

    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/export?format=csv", { headers: authHeader(token) })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const csv = await res.text();
    expect(csv).toContain("restaurant_name,overall_score");
    expect(csv).toContain("Pizza Place");
    // Verify quotes are escaped in CSV
    expect(csv).toContain('""pizza""');
  });

  it("handles empty data", async () => {
    const { db } = createMockDb();
    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/export", { headers: authHeader(token) })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { restaurants: unknown[]; my_reviews: unknown[] } };
    expect(body.data.restaurants).toHaveLength(0);
    expect(body.data.my_reviews).toHaveLength(0);
  });
});
