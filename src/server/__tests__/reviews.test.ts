import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import {
  TEST_SECRET,
  TEST_REVIEW,
  makeToken,
  authHeader,
} from "./helpers/auth";

function env(db: D1Database) {
  return { DB: db, JWT_SECRET: TEST_SECRET };
}

describe("POST /api/reviews/:restaurantId", () => {
  it("creates a review", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT id FROM restaurants": { id: "rest-1" },
        "SELECT id FROM reviews WHERE restaurant_id": null,
        "INSERT INTO reviews": TEST_REVIEW,
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/rest-1",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 8 }),
      },
      env(db)
    );
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.overall_score).toBe(8);
  });

  it("returns 409 for duplicate review", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT id FROM restaurants": { id: "rest-1" },
        "SELECT id FROM reviews WHERE restaurant_id": { id: "review-1" },
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/rest-1",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 8 }),
      },
      env(db)
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid score (too high)", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/rest-1",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 11 }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for score of 0", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/rest-1",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 0 }),
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
      "/api/reviews/nope",
      {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 8 }),
      },
      env(db)
    );
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/reviews/:id", () => {
  it("updates own review", async () => {
    const updatedReview = { ...TEST_REVIEW, overall_score: 9 };
    const { db } = createMockDb({
      first: {
        "SELECT id FROM reviews WHERE id": { id: "review-1" },
        "UPDATE reviews": updatedReview,
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/review-1",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 9 }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.overall_score).toBe(9);
  });

  it("returns 404 when updating someone else's review", async () => {
    const { db } = createMockDb({
      first: { "SELECT id FROM reviews WHERE id": null },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/review-2",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 9 }),
      },
      env(db)
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid score on update", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/review-1",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ overall_score: 0 }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/reviews/:id", () => {
  it("deletes own review", async () => {
    const { db } = createMockDb({
      first: { "SELECT id FROM reviews WHERE id": { id: "review-1" } },
      run: { "DELETE FROM reviews": { success: true } },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/review-1",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when deleting someone else's review", async () => {
    const { db } = createMockDb({
      first: { "SELECT id FROM reviews WHERE id": null },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reviews/review-2",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(404);
  });
});
