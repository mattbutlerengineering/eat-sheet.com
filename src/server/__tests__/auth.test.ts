import { describe, it, expect, beforeEach } from "vitest";
import {
  mockVerifyGoogleToken,
  TEST_GOOGLE_CLIENT_ID,
  TEST_GOOGLE_USER,
} from "./helpers/google-auth";
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
  return { DB: db, JWT_SECRET: TEST_SECRET, GOOGLE_CLIENT_ID: TEST_GOOGLE_CLIENT_ID };
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
      first: { "FROM members m": { ...TEST_MEMBER, family_name: "The Butlers" } },
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

describe("GET /api/auth/invite-code", () => {
  it("returns invite code for admin", async () => {
    const { db } = createMockDb({
      first: { "SELECT invite_code FROM families": { invite_code: "TEST123" } },
    });
    const token = await makeToken({ is_admin: true });
    const res = await app.request(
      "/api/auth/invite-code",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.invite_code).toBe("TEST123");
  });

  it("returns 403 for non-admin", async () => {
    const { db } = createMockDb();
    const token = await makeToken({ is_admin: false });
    const res = await app.request(
      "/api/auth/invite-code",
      { headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/regenerate-code", () => {
  it("regenerates code for admin", async () => {
    const { db } = createMockDb({
      first: { "UPDATE families SET invite_code": { invite_code: "NEWCODE1" } },
    });
    const token = await makeToken({ is_admin: true });
    const res = await app.request(
      "/api/auth/regenerate-code",
      { method: "POST", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.invite_code).toBeDefined();
  });

  it("returns 403 for non-admin", async () => {
    const { db } = createMockDb();
    const token = await makeToken({ is_admin: false });
    const res = await app.request(
      "/api/auth/regenerate-code",
      { method: "POST", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/auth/me", () => {
  it("returns 400 when name is empty", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/auth/me",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ name: "   " }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/auth/me",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({}),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when name exceeds 50 characters", async () => {
    const { db } = createMockDb();
    const token = await makeToken();
    const res = await app.request(
      "/api/auth/me",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ name: "A".repeat(51) }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("50 characters");
  });

  it("updates name successfully", async () => {
    const updatedMember = { ...TEST_MEMBER, name: "Matthew" };
    const { db } = createMockDb({
      first: { "UPDATE members SET name": updatedMember },
    });
    const token = await makeToken();
    const res = await app.request(
      "/api/auth/me",
      {
        method: "PUT",
        headers: authHeader(token),
        body: JSON.stringify({ name: "Matthew" }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.name).toBe("Matthew");
  });

  it("returns 401 without token", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/me",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Matt" }),
      },
      env(db)
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/google", () => {
  beforeEach(() => {
    mockVerifyGoogleToken.mockReset();
  });

  it("returns 400 when id_token is missing", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 503 when GOOGLE_CLIENT_ID is not configured", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: "some-token" }),
      },
      { DB: db, JWT_SECRET: TEST_SECRET } as any
    );
    expect(res.status).toBe(503);
  });

  it("returns 401 for invalid token", async () => {
    mockVerifyGoogleToken.mockRejectedValue(new Error("Invalid token"));
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: "bad-token" }),
      },
      env(db)
    );
    expect(res.status).toBe(401);
  });

  it("returns 'authenticated' when google_id is found", async () => {
    mockVerifyGoogleToken.mockResolvedValue(TEST_GOOGLE_USER);
    const memberWithGoogle = { ...TEST_MEMBER, google_id: TEST_GOOGLE_USER.sub, email: TEST_GOOGLE_USER.email };
    const { db } = createMockDb({
      first: { "WHERE m.google_id": memberWithGoogle },
    });
    const res = await app.request(
      "/api/auth/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: "valid-token" }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.status).toBe("authenticated");
    expect(body.data.token).toBeDefined();
    expect(body.data.member.name).toBe("Matt");
    expect(body.data.member.email).toBe("matt@gmail.com");
  });

  it("returns 'needs_registration' when google_id is not found", async () => {
    mockVerifyGoogleToken.mockResolvedValue(TEST_GOOGLE_USER);
    const { db } = createMockDb({
      first: { "WHERE m.google_id": null },
    });
    const res = await app.request(
      "/api/auth/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: "valid-token" }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.status).toBe("needs_registration");
    expect(body.data.google_user.google_id).toBe(TEST_GOOGLE_USER.sub);
    expect(body.data.google_user.email).toBe(TEST_GOOGLE_USER.email);
    expect(body.data.google_user.name).toBe(TEST_GOOGLE_USER.name);
  });
});

describe("POST /api/auth/join with google_id", () => {
  it("creates new member with google_id", async () => {
    const newMember = { ...TEST_MEMBER, google_id: "google-123", email: "test@gmail.com" };
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "WHERE google_id": null,
        "SELECT * FROM members": null,
        "SELECT COUNT": { count: 0 },
        "INSERT INTO members": newMember,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: "TEST123",
          name: "Matt",
          google_id: "google-123",
          email: "test@gmail.com",
        }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
  });

  it("links google_id to existing member", async () => {
    const memberWithoutGoogle = { ...TEST_MEMBER, google_id: null, email: null };
    const linkedMember = { ...TEST_MEMBER, google_id: "google-123", email: "test@gmail.com" };
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "WHERE google_id": null,
        "SELECT * FROM members": memberWithoutGoogle,
        "UPDATE members SET google_id": linkedMember,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: "TEST123",
          name: "Matt",
          google_id: "google-123",
          email: "test@gmail.com",
        }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
  });

  it("returns 409 when google_id is already linked to different member", async () => {
    const otherMember = { id: "member-other", family_id: "family-other", name: "Other" };
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "WHERE google_id": otherMember,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: "TEST123",
          name: "Matt",
          google_id: "google-123",
          email: "test@gmail.com",
        }),
      },
      env(db)
    );
    expect(res.status).toBe(409);
    const body: any = await res.json();
    expect(body.error).toContain("already linked");
  });

  it("works without google_id (backward compatible)", async () => {
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
  });
});

describe("DELETE /api/auth/members/:id", () => {
  it("returns 403 for non-admin", async () => {
    const { db } = createMockDb();
    const token = await makeToken({ is_admin: false });
    const res = await app.request(
      "/api/auth/members/member-2",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when admin tries to remove self", async () => {
    const { db } = createMockDb();
    const token = await makeToken({ member_id: "member-1", is_admin: true });
    const res = await app.request(
      "/api/auth/members/member-1",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("yourself");
  });

  it("returns 404 when member not found", async () => {
    const { db } = createMockDb({
      first: { "SELECT id FROM members": null },
    });
    const token = await makeToken({ is_admin: true });
    const res = await app.request(
      "/api/auth/members/nonexistent",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(404);
  });

  it("removes member successfully", async () => {
    const { db } = createMockDb({
      first: { "SELECT id FROM members": { id: "member-2" } },
    });
    const token = await makeToken({ is_admin: true });
    const res = await app.request(
      "/api/auth/members/member-2",
      { method: "DELETE", headers: authHeader(token) },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.success).toBe(true);
  });
});
