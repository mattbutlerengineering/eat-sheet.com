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

describe("GET /api/stats", () => {
  it("requires authentication", async () => {
    const { db } = createMockDb();
    const { fetch } = createApp(db);

    const res = await fetch(new Request("http://localhost/api/stats"));
    expect(res.status).toBe(401);
  });

  it("returns aggregated family stats", async () => {
    const { db } = createMockDb({
      first: {
        "COUNT(*) as count FROM restaurants": { count: 5 },
        "COUNT(*) as count FROM reviews": { count: 12 },
        "AVG(rv.food_score)": { food: 7.5, service: 8.0, ambiance: 6.5, value: 7.0 },
      },
      all: {
        "FROM members m": [
          { name: "Matt", review_count: 7, avg_score: 7.8 },
          { name: "Sarah", review_count: 5, avg_score: 8.2 },
        ],
        "GROUP BY cuisine": [
          { cuisine: "Italian", count: 3 },
          { cuisine: "Mexican", count: 2 },
        ],
      },
    });
    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/stats", {
        headers: authHeader(token),
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.total_restaurants).toBe(5);
    expect(body.data.total_reviews).toBe(12);
    expect(body.data.members).toHaveLength(2);
    expect(body.data.members[0].name).toBe("Matt");
    expect(body.data.cuisine_breakdown).toHaveLength(2);
    expect(body.data.category_averages.food).toBe(7.5);
  });

  it("handles empty data gracefully", async () => {
    const { db } = createMockDb({
      first: {
        "COUNT(*) as count FROM restaurants": { count: 0 },
        "COUNT(*) as count FROM reviews": { count: 0 },
        "AVG(rv.food_score)": { food: null, service: null, ambiance: null, value: null },
      },
      all: {
        "FROM members m": [],
        "GROUP BY cuisine": [],
      },
    });
    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/stats", {
        headers: authHeader(token),
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.total_restaurants).toBe(0);
    expect(body.data.total_reviews).toBe(0);
    expect(body.data.members).toHaveLength(0);
    expect(body.data.cuisine_breakdown).toHaveLength(0);
  });
});
