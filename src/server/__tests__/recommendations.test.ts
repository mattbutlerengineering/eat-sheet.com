import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { makeToken, authHeader, TEST_SECRET, TEST_RESTAURANT } from "./helpers/auth";

const BOOKMARKED_RESTAURANT = {
  ...TEST_RESTAURANT,
  id: "rest-bm",
  name: "Bookmarked Spot",
  avg_score: null,
  review_count: 0,
};

const REVISIT_RESTAURANT = {
  ...TEST_RESTAURANT,
  id: "rest-rv",
  name: "Old Favorite",
  avg_score: 8.0,
  review_count: 1,
};

const ONE_REVIEW_RESTAURANT = {
  ...TEST_RESTAURANT,
  id: "rest-1r",
  name: "Needs Opinions",
  avg_score: 7.0,
  review_count: 1,
};

const NEW_CUISINE_RESTAURANT = {
  ...TEST_RESTAURANT,
  id: "rest-nc",
  name: "Thai Delight",
  cuisine: "Thai",
  new_cuisine: "Thai",
  avg_score: 9.0,
  review_count: 2,
};

describe("Recommendations API", () => {
  describe("GET /api/recommendations", () => {
    it("should return all 4 recommendation categories", async () => {
      const { db } = createMockDb({
        all: {
          "FROM bookmarks b": [BOOKMARKED_RESTAURANT],
          "visited_at <= date": [REVISIT_RESTAURANT],
          "HAVING COUNT(rv.id) = 1": [ONE_REVIEW_RESTAURANT],
          "cuisine NOT IN": [NEW_CUISINE_RESTAURANT],
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/recommendations", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.bookmarked).toHaveLength(1);
      expect(body.data.bookmarked[0].name).toBe("Bookmarked Spot");
      expect(body.data.revisit).toHaveLength(1);
      expect(body.data.revisit[0].name).toBe("Old Favorite");
      expect(body.data.needs_opinions).toHaveLength(1);
      expect(body.data.needs_opinions[0].name).toBe("Needs Opinions");
      expect(body.data.new_cuisines).toHaveLength(1);
      expect(body.data.new_cuisines[0].cuisine).toBe("Thai");
      expect(body.data.new_cuisines[0].restaurant.name).toBe("Thai Delight");
    });

    it("should return empty arrays when no recommendations", async () => {
      const { db } = createMockDb({
        all: {},
      });
      const token = await makeToken();

      const res = await app.request("/api/recommendations", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.bookmarked).toHaveLength(0);
      expect(body.data.revisit).toHaveLength(0);
      expect(body.data.needs_opinions).toHaveLength(0);
      expect(body.data.new_cuisines).toHaveLength(0);
    });

    it("should require auth", async () => {
      const { db } = createMockDb();
      const res = await app.request("/api/recommendations", {
        headers: { "Content-Type": "application/json" },
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(401);
    });

    it("should handle partial results (some categories empty)", async () => {
      const { db } = createMockDb({
        all: {
          "FROM bookmarks b": [BOOKMARKED_RESTAURANT],
          "HAVING COUNT(rv.id) = 1": [ONE_REVIEW_RESTAURANT],
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/recommendations", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.bookmarked).toHaveLength(1);
      expect(body.data.revisit).toHaveLength(0);
      expect(body.data.needs_opinions).toHaveLength(1);
      expect(body.data.new_cuisines).toHaveLength(0);
    });
  });
});
