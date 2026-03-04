import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import {
  TEST_SECRET,
  TEST_FAMILY,
  TEST_MEMBER,
  TEST_MEMBER_2,
  makeToken,
  authHeader,
} from "./helpers/auth";

function env(db: D1Database) {
  return { DB: db, JWT_SECRET: TEST_SECRET };
}

describe("POST /api/auth/join", () => {
  it("returns 400 when name is missing", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123" }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid invite code", async () => {
    const { db } = createMockDb({
      first: { "SELECT * FROM families": null },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "WRONG", name: "Matt" }),
      },
      env(db)
    );
    expect(res.status).toBe(404);
  });

  it("returns token for valid invite code with existing member", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "SELECT * FROM members": TEST_MEMBER,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt" }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.member.name).toBe("Matt");
  });

  it("creates new member when name is new", async () => {
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "SELECT * FROM members": null,
        "INSERT INTO members": TEST_MEMBER,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt" }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without token", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/me", {}, env(db));
    expect(res.status).toBe(401);
  });

  it("returns member data with valid token", async () => {
    const { db } = createMockDb({
      first: { "SELECT id, family_id, name FROM members": TEST_MEMBER },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/auth/me",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.name).toBe("Matt");
  });
});

describe("GET /api/auth/members", () => {
  it("returns family members", async () => {
    const { db } = createMockDb({
      all: {
        "SELECT id, family_id, name FROM members": [TEST_MEMBER, TEST_MEMBER_2],
      },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/auth/members",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data).toHaveLength(2);
  });
});
