import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { TEST_SECRET, makeToken, authHeader } from "./helpers/auth";

function env(db: D1Database) {
  return { DB: db, JWT_SECRET: TEST_SECRET, PHOTOS: {} as R2Bucket };
}

describe("POST /api/reactions/:reviewId", () => {
  it("requires authentication", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/reactions/review-1",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji: "fire" }) },
      env(db)
    );
    expect(res.status).toBe(401);
  });

  it("rejects invalid emoji", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/reactions/review-1",
      { method: "POST", headers: authHeader(token), body: JSON.stringify({ emoji: "invalid" }) },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent review", async () => {
    const { db } = createMockDb({
      first: { "FROM reviews rv": null },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reactions/review-999",
      { method: "POST", headers: authHeader(token), body: JSON.stringify({ emoji: "fire" }) },
      env(db)
    );
    expect(res.status).toBe(404);
  });

  it("adds a new reaction", async () => {
    const { db } = createMockDb({
      first: {
        "FROM reviews rv": { id: "review-1" },
        "FROM reactions WHERE": null,
      },
      run: { "INSERT INTO reactions": { success: true } },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reactions/review-1",
      { method: "POST", headers: authHeader(token), body: JSON.stringify({ emoji: "heart" }) },
      env(db)
    );
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.action).toBe("added");
  });

  it("toggles off same emoji", async () => {
    const { db } = createMockDb({
      first: {
        "FROM reviews rv": { id: "review-1" },
        "FROM reactions WHERE": { id: "rc-1", emoji: "fire" },
      },
      run: { "DELETE FROM reactions": { success: true } },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reactions/review-1",
      { method: "POST", headers: authHeader(token), body: JSON.stringify({ emoji: "fire" }) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.action).toBe("removed");
  });

  it("switches to different emoji", async () => {
    const { db } = createMockDb({
      first: {
        "FROM reviews rv": { id: "review-1" },
        "FROM reactions WHERE": { id: "rc-1", emoji: "fire" },
      },
      run: { "UPDATE reactions": { success: true } },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/reactions/review-1",
      { method: "POST", headers: authHeader(token), body: JSON.stringify({ emoji: "heart" }) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.action).toBe("switched");
    expect(body.data.emoji).toBe("heart");
  });
});
