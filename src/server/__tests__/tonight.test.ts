import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { makeToken, authHeader, TEST_SECRET, TEST_RESTAURANT } from "./helpers/auth";

const FAVORITE_RESTAURANT = {
  ...TEST_RESTAURANT,
  id: "rest-fav",
  name: "Family Favorite",
  avg_score: 8.5,
  review_count: 3,
  user_bookmarked: 0,
};

const BOOKMARKED_RESTAURANT = {
  ...TEST_RESTAURANT,
  id: "rest-bm",
  name: "Bookmarked Spot",
  avg_score: 7.0,
  review_count: 1,
  user_bookmarked: 1,
};

const NEW_RESTAURANT = {
  ...TEST_RESTAURANT,
  id: "rest-new",
  name: "Unexplored Gem",
  avg_score: null,
  review_count: 0,
  user_bookmarked: 0,
};

describe("Tonight API", () => {
  describe("GET /api/tonight", () => {
    it("should require auth", async () => {
      const { db } = createMockDb();
      const res = await app.request("/api/tonight?mode=usual", {
        headers: { "Content-Type": "application/json" },
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(401);
    });

    it("should reject invalid mode", async () => {
      const { db } = createMockDb();
      const token = await makeToken();

      const res = await app.request("/api/tonight?mode=invalid", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error).toMatch(/mode/);
    });

    it("should reject missing mode", async () => {
      const { db } = createMockDb();
      const token = await makeToken();

      const res = await app.request("/api/tonight", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(400);
    });

    it("should return usual mode suggestions with reason", async () => {
      const { db } = createMockDb({
        all: {
          "HAVING AVG": [FAVORITE_RESTAURANT, BOOKMARKED_RESTAURANT],
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/tonight?mode=usual", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0].name).toBe("Family Favorite");
      expect(body.data[0].reason).toContain("Scored 8.5");
      expect(body.data[0].reason).toContain("3 reviews");
    });

    it("should include bookmark info in reason", async () => {
      const { db } = createMockDb({
        all: {
          "HAVING AVG": [BOOKMARKED_RESTAURANT],
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/tonight?mode=usual", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data[0].reason).toContain("You bookmarked this");
    });

    it("should return new mode suggestions", async () => {
      const { db } = createMockDb({
        all: {
          "my_rv.id IS NULL": [NEW_RESTAURANT],
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/tonight?mode=new", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Unexplored Gem");
    });

    it("should return empty array when no suggestions", async () => {
      const { db } = createMockDb({ all: {} });
      const token = await makeToken();

      const res = await app.request("/api/tonight?mode=usual", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(0);
    });

    it("should return 'Worth a try' when no score or bookmarks", async () => {
      const noScoreRestaurant = {
        ...TEST_RESTAURANT,
        id: "rest-ns",
        name: "Mystery Place",
        avg_score: null,
        review_count: 0,
        user_bookmarked: 0,
      };
      const { db } = createMockDb({
        all: {
          "my_rv.id IS NULL": [noScoreRestaurant],
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/tonight?mode=new", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data[0].reason).toBe("Worth a try");
    });
  });
});
