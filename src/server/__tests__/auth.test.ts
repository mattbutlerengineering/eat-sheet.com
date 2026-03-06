import { describe, it, expect } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import {
  TEST_SECRET,
  TEST_MEMBER,
  TEST_MEMBER_2,
  TEST_GROUP,
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
        body: JSON.stringify({ invite_code: "TEST123" }),
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
        body: JSON.stringify({ invite_code: "TEST123", registration_token: "bad-token" }),
      },
      env(db)
    );
    expect(res.status).toBe(401);
  });

  it("creates solo user when no invite_code provided", async () => {
    const regToken = await makeRegistrationToken();
    const { db } = createMockDb({
      first: {
        "WHERE oauth_provider": null,
        "INSERT INTO members": TEST_MEMBER,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.member.name).toBe("Matt");
  });

  it("returns 404 for invalid invite code", async () => {
    const regToken = await makeRegistrationToken();
    const { db } = createMockDb({
      first: {
        "WHERE oauth_provider": null,
        "INSERT INTO members": TEST_MEMBER,
        "SELECT * FROM groups": null,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: "WRONG", registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(404);
  });

  it("returns token for existing OAuth user", async () => {
    const regToken = await makeRegistrationToken();
    const existingMember = { ...TEST_MEMBER, oauth_provider: "google", oauth_id: "google-123" };
    const { db } = createMockDb({
      first: {
        "WHERE oauth_provider": existingMember,
      },
    });
    const res = await app.request(
      "/api/auth/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_token: regToken }),
      },
      env(db)
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.member.name).toBe("Matt");
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without token", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/me", {}, env(db));
    expect(res.status).toBe(401);
  });

  it("returns member data with groups", async () => {
    const memberData = { id: TEST_MEMBER.id, name: TEST_MEMBER.name, email: "matt@test.com" };
    const groupData = { id: TEST_GROUP.id, name: TEST_GROUP.name, is_admin: 1, member_count: 2 };
    const { db } = createMockDb({
      all: {
        "SELECT id, name, email FROM members": [memberData],
        "FROM group_members": [groupData],
      },
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
    expect(body.data.groups).toBeDefined();
  });
});

describe("GET /api/auth/members", () => {
  it("returns visible peers", async () => {
    const { db } = createMockDb({
      all: {
        "FROM members m": [
          { id: TEST_MEMBER.id, name: TEST_MEMBER.name },
          { id: TEST_MEMBER_2.id, name: TEST_MEMBER_2.name },
        ],
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
    const { db } = createMockDb({
      first: { "UPDATE members SET name": { id: TEST_MEMBER.id, name: "Matthew" } },
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
