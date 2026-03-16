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

describe("GET /api/achievements", () => {
  it("requires authentication", async () => {
    const { db } = createMockDb();
    const { fetch } = createApp(db);

    const res = await fetch(new Request("http://localhost/api/achievements"));
    expect(res.status).toBe(401);
  });

  it("returns badges with earned status for active reviewer", async () => {
    const { db } = createMockDb({
      first: {
        "FROM reviews WHERE member_id": { count: 6 },
        "FROM restaurants WHERE created_by": { count: 2 },
        "COUNT(DISTINCT r.cuisine)": { count: 3 },
      },
      all: {
        "overall_score, COUNT": [
          { overall_score: 8, count: 3 },
          { overall_score: 10, count: 1 },
          { overall_score: 2, count: 2 },
        ],
      },
    });

    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/achievements", {
        headers: authHeader(token),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { badges: Array<{ id: string; earned: boolean; progress?: string }>; earned_count: number; total_count: number };
    };

    expect(body.data.total_count).toBe(10);
    expect(body.data.earned_count).toBeGreaterThan(0);

    const firstReview = body.data.badges.find((b) => b.id === "first_review");
    expect(firstReview?.earned).toBe(true);

    const fiveReviews = body.data.badges.find((b) => b.id === "five_reviews");
    expect(fiveReviews?.earned).toBe(true);

    const perfectTen = body.data.badges.find((b) => b.id === "perfect_ten");
    expect(perfectTen?.earned).toBe(true);

    const fiftyReviews = body.data.badges.find((b) => b.id === "fifty_reviews");
    expect(fiftyReviews?.earned).toBe(false);
    expect(fiftyReviews?.progress).toBe("6/50");
  });

  it("returns all badges unearned for new user", async () => {
    const { db } = createMockDb({
      first: {
        "FROM reviews WHERE member_id": { count: 0 },
        "FROM restaurants WHERE created_by": { count: 0 },
        "COUNT(DISTINCT r.cuisine)": { count: 0 },
      },
    });

    const { fetch } = createApp(db);
    const token = await makeToken();

    const res = await fetch(
      new Request("http://localhost/api/achievements", {
        headers: authHeader(token),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { badges: Array<{ id: string; earned: boolean }>; earned_count: number };
    };
    expect(body.data.earned_count).toBe(0);
    expect(body.data.badges.every((b) => !b.earned)).toBe(true);
  });
});
