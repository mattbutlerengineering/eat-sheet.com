import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { makeToken, authHeader, TEST_SECRET } from "./helpers/auth";

describe("Share API", () => {
  describe("POST /api/share/restaurant/:id", () => {
    it("should generate a share token for a restaurant", async () => {
      const { db } = createMockDb({
        first: {
          "SELECT id, share_token FROM restaurants": { id: "rest-1", share_token: null },
        },
        run: {
          "UPDATE restaurants SET share_token": { success: true },
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/share/restaurant/rest-1", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.share_token).toBeTruthy();
      expect(typeof body.data.share_token).toBe("string");
    });

    it("should reuse existing share token", async () => {
      const { db } = createMockDb({
        first: {
          "SELECT id, share_token FROM restaurants": { id: "rest-1", share_token: "existing-token-abc" },
        },
      });
      const token = await makeToken();

      const res = await app.request("/api/share/restaurant/rest-1", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.share_token).toBe("existing-token-abc");
    });

    it("should return 404 for non-existent restaurant", async () => {
      const { db } = createMockDb({
        first: { "SELECT id, share_token FROM restaurants": null },
      });
      const token = await makeToken();

      const res = await app.request("/api/share/restaurant/rest-999", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/share/restaurant/:token (public)", () => {
    it("should return public restaurant data without member info", async () => {
      const { db } = createMockDb({
        first: {
          "WHERE r.share_token": {
            name: "Pizza Place",
            cuisine: "Italian",
            address: "123 Main St",
            photo_url: null,
            avg_score: 8.5,
            review_count: 3,
          },
        },
      });

      const res = await app.request("/api/share/restaurant/some-token", {}, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.name).toBe("Pizza Place");
      expect(body.data.avg_score).toBe(8.5);
      // Should NOT contain member info
      expect(body.data.member_name).toBeUndefined();
      expect(body.data.created_by).toBeUndefined();
    });

    it("should return 404 for invalid token", async () => {
      const { db } = createMockDb({
        first: { "WHERE r.share_token": null },
      });

      const res = await app.request("/api/share/restaurant/bad-token", {}, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/share/review/:token (public)", () => {
    it("should return public review data without member name", async () => {
      const { db } = createMockDb({
        first: {
          "WHERE rv.share_token": {
            overall_score: 9,
            notes: "Amazing food",
            photo_url: null,
            restaurant_name: "Pizza Place",
            restaurant_cuisine: "Italian",
          },
        },
      });

      const res = await app.request("/api/share/review/some-review-token", {}, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.overall_score).toBe(9);
      expect(body.data.restaurant_name).toBe("Pizza Place");
      // Should NOT contain member info
      expect(body.data.member_name).toBeUndefined();
      expect(body.data.member_id).toBeUndefined();
    });
  });
});
