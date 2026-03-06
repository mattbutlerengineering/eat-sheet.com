import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { makeToken, authHeader, TEST_SECRET } from "./helpers/auth";

describe("Groups API", () => {
  describe("POST /api/groups (error handling)", () => {
    it("should return JSON 500 when DB throws", async () => {
      // Create a db that throws on INSERT INTO groups
      const { db } = createMockDb({});
      const originalPrepare = db.prepare.bind(db);
      db.prepare = (sql: string) => {
        const stmt = originalPrepare(sql);
        if (sql.includes("INSERT INTO groups")) {
          return {
            ...stmt,
            bind: () => ({
              first: () => Promise.reject(new Error("D1_ERROR: UNIQUE constraint failed")),
              all: () => Promise.reject(new Error("D1_ERROR")),
              run: () => Promise.reject(new Error("D1_ERROR")),
            }),
          };
        }
        return stmt;
      };

      const token = await makeToken();
      const res = await app.request("/api/groups", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ name: "Test Group" }),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(500);
      const body: any = await res.json();
      expect(body.error).toBeDefined();
    });
  });

  describe("POST /api/groups/repair", () => {
    it("should repair orphaned group_members", async () => {
      const { db } = createMockDb({
        all: {
          // Orphaned group_members query returns one result
          "LEFT JOIN groups": [{ group_id: "family-1" }],
        },
        first: {
          // Family name lookup succeeds
          "SELECT name FROM families": { name: "The Butlers" },
        },
        run: {
          "INSERT INTO groups": { success: true },
          "UPDATE group_members": { success: true },
        },
      });

      const token = await makeToken();
      const res = await app.request("/api/groups/repair", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.repaired).toBe(1);
    });

    it("should return repaired: 0 when no orphans exist", async () => {
      const { db } = createMockDb({
        all: {
          "LEFT JOIN groups": [],
        },
      });

      const token = await makeToken();
      const res = await app.request("/api/groups/repair", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.repaired).toBe(0);
    });

    it("should use fallback name when family not found", async () => {
      const { db, calls } = createMockDb({
        all: {
          "LEFT JOIN groups": [{ group_id: "orphan-1" }],
        },
        first: {
          "SELECT name FROM families": null,
        },
        run: {
          "INSERT INTO groups": { success: true },
          "UPDATE group_members": { success: true },
        },
      });

      const token = await makeToken();
      const res = await app.request("/api/groups/repair", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.repaired).toBe(1);

      // Verify the INSERT used the fallback name
      const insertCall = calls.find((c) => c.sql.includes("INSERT INTO groups"));
      expect(insertCall).toBeDefined();
      expect(insertCall!.params[1]).toBe("Matt's Group");
    });

    it("should return 401 without auth", async () => {
      const { db } = createMockDb({});

      const res = await app.request("/api/groups/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }, { DB: db, JWT_SECRET: TEST_SECRET });

      expect(res.status).toBe(401);
    });
  });
});
