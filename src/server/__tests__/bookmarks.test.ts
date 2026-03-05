import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { makeToken, authHeader, TEST_SECRET, TEST_RESTAURANT } from "./helpers/auth";

describe("Bookmarks API", () => {
  describe("POST /api/bookmarks/:restaurantId", () => {
    it("should create a bookmark when none exists", async () => {
      const { db } = createMockDb({
        first: {
          "SELECT id FROM restaurants": { id: "rest-1" },
          "SELECT id FROM bookmarks": null,
        },
        run: {
          "INSERT INTO bookmarks": { success: true },
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/bookmarks/rest-1", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(201);
      const body: any = await res.json();
      expect(body.data.bookmarked).toBe(true);
    });

    it("should remove a bookmark when one exists", async () => {
      const { db } = createMockDb({
        first: {
          "SELECT id FROM restaurants": { id: "rest-1" },
          "SELECT id FROM bookmarks": { id: "bm-1" },
        },
        run: {
          "DELETE FROM bookmarks": { success: true },
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/bookmarks/rest-1", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.bookmarked).toBe(false);
    });

    it("should return 404 for non-existent restaurant", async () => {
      const { db } = createMockDb({
        first: { "SELECT id FROM restaurants": null },
      });
      const token = await makeToken();

      const res = await app.request("/api/bookmarks/rest-999", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(404);
    });

    it("should require auth", async () => {
      const { db } = createMockDb();
      const res = await app.request("/api/bookmarks/rest-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/bookmarks", () => {
    it("should return bookmarked restaurants", async () => {
      const { db } = createMockDb({
        all: {
          "FROM bookmarks b": [
            { ...TEST_RESTAURANT, avg_score: 8.5, review_count: 2, bookmarked_at: "2026-01-20" },
          ],
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/bookmarks", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Pizza Place");
    });

    it("should return empty array when no bookmarks", async () => {
      const { db } = createMockDb({
        all: { "FROM bookmarks b": [] },
      });
      const token = await makeToken();

      const res = await app.request("/api/bookmarks", {
        headers: authHeader(token),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(0);
    });
  });
});
