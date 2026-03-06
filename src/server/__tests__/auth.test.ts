import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import {
  TEST_SECRET,
  TEST_FAMILY,
  TEST_MEMBER,
  TEST_MEMBER_2,
  makeToken,
  makeRegistrationToken,
  authHeader,
} from "./helpers/auth";

function env(db: D1Database) {
  return {
    DB: db,
    JWT_SECRET: TEST_SECRET,
    GOOGLE_OAUTH_CLIENT_ID: "test-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "test-client-secret",
    OAUTH_REDIRECT_BASE: "http://localhost:5173",
  };
}

describe("GET /api/auth/:provider", () => {
  it("returns 404 for unknown provider", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/facebook", {}, env(db));
    expect(res.status).toBe(404);
  });

  it("redirects to Google for valid provider", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/google", { redirect: "manual" }, env(db));
    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toContain("accounts.google.com");
  });

  it("sets state and code_verifier cookies", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/google", { redirect: "manual" }, env(db));
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c: string) => c.startsWith("oauth_state="))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith("oauth_code_verifier="))).toBe(true);
  });
});

describe("GET /api/auth/:provider/callback", () => {
  it("returns 400 when state is missing or mismatched", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/google/callback?code=test-code&state=bad-state",
      { headers: { Cookie: "oauth_state=good-state; oauth_code_verifier=verifier" } },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown provider callback", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/facebook/callback?code=test", {}, env(db));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/auth/join", () => {
  it("returns 400 when registration_token is missing", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt" }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("registration token");
  });

  it("returns 401 for invalid registration_token", async () => {
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt", registration_token: "bad-token" }),
      },
      env(db)
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const regToken = await makeRegistrationToken();
    const { db } = createMockDb();
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid invite code", async () => {
    const regToken = await makeRegistrationToken();
    const { db } = createMockDb({
      first: { "SELECT * FROM families": null, "WHERE oauth_provider": null },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "WRONG", name: "Matt", registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(404);
  });

  it("returns token for valid invite code with existing member", async () => {
    const regToken = await makeRegistrationToken();
    const existingMember = { ...TEST_MEMBER, oauth_provider: "google", oauth_id: "google-123" };
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "WHERE oauth_provider": existingMember,
        "SELECT * FROM members": existingMember,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt", registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.member.name).toBe("Matt");
  });

  it("creates new member when name is new", async () => {
    const regToken = await makeRegistrationToken();
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "WHERE oauth_provider": null,
        "SELECT * FROM members": null,
        "SELECT COUNT": { count: 0 },
        "INSERT INTO members": TEST_MEMBER,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt", registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
  });

  it("links OAuth identity to existing member without one", async () => {
    const regToken = await makeRegistrationToken();
    const memberWithoutOAuth = { ...TEST_MEMBER, oauth_provider: null, oauth_id: null };
    const linkedMember = { ...TEST_MEMBER, oauth_provider: "google", oauth_id: "google-123" };
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "WHERE oauth_provider": null,
        "SELECT * FROM members": memberWithoutOAuth,
        "UPDATE members SET oauth_provider": linkedMember,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt", registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
  });

  it("returns 409 when OAuth identity is already linked to different member", async () => {
    const regToken = await makeRegistrationToken();
    const otherMember = { id: "member-other", family_id: "family-other", name: "Other" };
    const { db } = createMockDb({
      first: {
        "SELECT * FROM families": TEST_FAMILY,
        "WHERE oauth_provider": otherMember,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "TEST123", name: "Matt", registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(409);
    const body: any = await res.json();
    expect(body.error).toContain("already linked");
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
