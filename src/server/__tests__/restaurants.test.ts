import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import {
  TEST_SECRET,
  TEST_RESTAURANT,
  TEST_REVIEW,
  makeToken,
  authHeader,
} from "./helpers/auth";

function env(db: D1Database) {
  return { DB: db, JWT_SECRET: TEST_SECRET };
}

describe("GET /api/restaurants", () => {
  it("returns restaurants for the family", async () => {
    const { db } = createMockDb({
      all: {
        "FROM restaurants": [
          { ...TEST_RESTAURANT, avg_score: 8.0, review_count: 1 },
        ],
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Pizza Place");
  });
});

describe("GET /api/restaurants/:id", () => {
  it("returns restaurant detail with reviews", async () => {
    const { db } = createMockDb({
      first: {
        "FROM restaurants": { ...TEST_RESTAURANT, avg_score: 8.0, review_count: 1 },
      },
      all: {
        "FROM reviews": [{ ...TEST_REVIEW, member_name: "Matt" }],
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/rest-1",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.name).toBe("Pizza Place");
    expect(body.data.reviews).toHaveLength(1);
  });

  it("returns 404 for nonexistent restaurant", async () => {
    const { db } = createMockDb({
      first: { "FROM restaurants": null },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/nope",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/restaurants", () => {
  it("creates a restaurant", async () => {
    const { db } = createMockDb({
      first: { "INSERT INTO restaurants": TEST_RESTAURANT },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ name: "Pizza Place", cuisine: "Italian" }),
      },
      env(db)
    );
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.name).toBe("Pizza Place");
  });

  it("returns 400 when name is missing", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ cuisine: "Italian" }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/restaurants",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Pizza Place" }),
      },
      env(db)
    );
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/restaurants/:id", () => {
  it("deletes restaurant when creator", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT id, created_by FROM restaurants": {
          id: "rest-1",
          created_by: "member-1",
        },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/rest-1",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 403 when not creator", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT id, created_by FROM restaurants": {
          id: "rest-1",
          created_by: "member-2",
        },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/rest-1",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent restaurant", async () => {
    const { db } = createMockDb({
      first: { "SELECT id, created_by FROM restaurants": null },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/nope",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(404);
  });
});
