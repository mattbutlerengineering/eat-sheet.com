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

describe("GET /api/activity", () => {
  it("requires authentication", async () => {
    const { db } = createMockDb();
    const { fetch } = createApp(db);

    const res = await fetch(new Request("http://localhost/api/activity"));
    expect(res.status).toBe(401);
  });

  it("returns activity events scoped to family", async () => {
    const mockEvents = [
      {
        id: "rest-1",
        type: "restaurant_added",
        member_name: "Matt",
        restaurant_id: "rest-1",
        restaurant_name: "Pizza Place",
        score: null,
        timestamp: "2026-02-01T00:00:00Z",
      },
      {
        id: "review-1",
        type: "review_added",
        member_name: "Sarah",
        restaurant_id: "rest-1",
        restaurant_name: "Pizza Place",
        score: 8,
        timestamp: "2026-02-02T00:00:00Z",
      },
    ];

    const { db } = createMockDb({
      all: { "ORDER BY timestamp DESC": mockEvents },
    });
    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/activity", {
        headers: authHeader(token),
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].type).toBe("restaurant_added");
    expect(body.data[0].member_name).toBe("Matt");
    expect(body.data[1].type).toBe("review_added");
    expect(body.data[1].score).toBe(8);
  });

  it("returns empty array when no activity", async () => {
    const { db } = createMockDb({
      all: { "ORDER BY timestamp DESC": [] },
    });
    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/activity", {
        headers: authHeader(token),
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it("includes review_updated events", async () => {
    const mockEvents = [
      {
        id: "review-2",
        type: "review_updated",
        member_name: "Matt",
        restaurant_id: "rest-1",
        restaurant_name: "Pizza Place",
        score: 9,
        timestamp: "2026-02-05T00:00:00Z",
      },
    ];

    const { db } = createMockDb({
      all: { "ORDER BY timestamp DESC": mockEvents },
    });
    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/activity", {
        headers: authHeader(token),
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data[0].type).toBe("review_updated");
    expect(body.data[0].score).toBe(9);
  });
});
