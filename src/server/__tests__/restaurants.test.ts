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
  it("returns restaurants with creator_name and last_visited_at", async () => {
    const { db } = createMockDb({
      all: {
        "FROM restaurants": [
          { ...TEST_RESTAURANT, avg_score: 8.0, review_count: 1, creator_name: "Matt", last_visited_at: "2026-01-10" },
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
    expect(body.data[0].creator_name).toBe("Matt");
    expect(body.data[0].last_visited_at).toBe("2026-01-10");
  });
});

describe("GET /api/restaurants/:id", () => {
  it("returns restaurant detail with reviews and category averages", async () => {
    const { db } = createMockDb({
      first: {
        "FROM restaurants": {
          ...TEST_RESTAURANT,
          avg_score: 8.0,
          review_count: 1,
          avg_food: 9.0,
          avg_service: 7.0,
          avg_ambiance: 8.0,
          avg_value: 7.0,
        },
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
    expect(body.data.avg_food).toBe(9.0);
    expect(body.data.avg_service).toBe(7.0);
    expect(body.data.avg_ambiance).toBe(8.0);
    expect(body.data.avg_value).toBe(7.0);
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

describe("PUT /api/restaurants/:id", () => {
  it("updates a restaurant", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT id FROM restaurants": { id: "rest-1" },
        "UPDATE restaurants": {
          ...TEST_RESTAURANT,
          name: "Updated Name",
          photo_url: "/api/photos/family-1/new.jpeg",
        },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/rest-1",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({
          name: "Updated Name",
          cuisine: "Italian",
          address: "123 Main St",
          photo_url: "/api/photos/family-1/new.jpeg",
        }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.name).toBe("Updated Name");
    expect(body.data.photo_url).toBe("/api/photos/family-1/new.jpeg");
  });

  it("returns 400 if name is missing", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/rest-1",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ cuisine: "Italian" }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent restaurant", async () => {
    const { db } = createMockDb({
      first: { "SELECT id FROM restaurants": null },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/restaurants/nope",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ name: "Test" }),
      },
      env(db)
    );
    expect(res.status).toBe(404);
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
