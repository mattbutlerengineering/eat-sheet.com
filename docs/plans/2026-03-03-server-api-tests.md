# Server API Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Vitest-based server API tests covering auth, restaurants, and reviews routes with ~28 tests targeting authorization, validation, and CRUD logic.

**Architecture:** Use Hono's `app.request()` to test routes directly without HTTP. Mock D1 database with a configurable factory. Generate real JWT tokens via `hono/jwt` for auth tests.

**Tech Stack:** Vitest, Hono test helpers, hono/jwt for token generation

---

### Task 1: Install Vitest and Configure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install vitest**

Run: `npm install -D vitest`

**Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@server": "./src/server",
      "@client": "./src/client",
    },
  },
});
```

**Step 3: Add test script to package.json**

Add to scripts: `"test": "vitest run", "test:watch": "vitest"`

**Step 4: Run vitest to confirm setup works**

Run: `npx vitest run`
Expected: "No test files found" (not an error, just no tests yet)

**Step 5: Commit**

```
chore: add vitest config and test script
```

---

### Task 2: Create Mock D1 Helper

**Files:**
- Create: `src/server/__tests__/helpers/mock-db.ts`

**Step 1: Write the mock D1 factory**

This helper returns a mock D1Database that tracks calls and returns configured responses. Each test configures what `first()`, `all()`, and `run()` return.

```ts
interface MockStatement {
  bind: (...args: unknown[]) => MockStatement;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean }>;
}

interface MockCall {
  sql: string;
  params: unknown[];
}

interface MockDbConfig {
  first?: Record<string, unknown | null>;
  all?: Record<string, unknown[]>;
  run?: Record<string, { success: boolean }>;
  batch?: unknown[][];
}

export function createMockDb(config: MockDbConfig = {}) {
  const calls: MockCall[] = [];

  const createStatement = (sql: string): MockStatement => {
    let boundParams: unknown[] = [];

    const stmt: MockStatement = {
      bind(...args: unknown[]) {
        boundParams = args;
        calls.push({ sql, params: args });
        return stmt;
      },
      async first<T = unknown>(): Promise<T | null> {
        const key = Object.keys(config.first ?? {}).find((k) => sql.includes(k));
        return (key ? config.first![key] : null) as T | null;
      },
      async all<T = unknown>(): Promise<{ results: T[] }> {
        const key = Object.keys(config.all ?? {}).find((k) => sql.includes(k));
        return { results: (key ? config.all![key] : []) as T[] };
      },
      async run(): Promise<{ success: boolean }> {
        const key = Object.keys(config.run ?? {}).find((k) => sql.includes(k));
        return key ? config.run![key]! : { success: true };
      },
    };
    return stmt;
  };

  const db = {
    prepare: (sql: string) => createStatement(sql),
    batch: async (stmts: MockStatement[]) => {
      return stmts.map(() => ({ success: true }));
    },
  };

  return { db: db as unknown as D1Database, calls };
}
```

**Step 2: Commit**

```
test: add mock D1 database helper
```

---

### Task 3: Create JWT Test Helper

**Files:**
- Create: `src/server/__tests__/helpers/auth.ts`

**Step 1: Write the JWT test helper**

```ts
import { sign } from "hono/jwt";

export const TEST_SECRET = "test-jwt-secret-for-tests";

export const TEST_FAMILY = {
  id: "family-1",
  name: "The Butlers",
  invite_code: "TEST123",
  created_at: "2026-01-01T00:00:00Z",
};

export const TEST_MEMBER = {
  id: "member-1",
  family_id: "family-1",
  name: "Matt",
  created_at: "2026-01-01T00:00:00Z",
};

export const TEST_MEMBER_2 = {
  id: "member-2",
  family_id: "family-1",
  name: "Sarah",
  created_at: "2026-01-01T00:00:00Z",
};

export const TEST_RESTAURANT = {
  id: "rest-1",
  family_id: "family-1",
  name: "Pizza Place",
  cuisine: "Italian",
  address: "123 Main St",
  photo_url: null,
  created_by: "member-1",
  created_at: "2026-01-15T00:00:00Z",
};

export const TEST_REVIEW = {
  id: "review-1",
  restaurant_id: "rest-1",
  member_id: "member-1",
  overall_score: 8,
  food_score: 9,
  service_score: 7,
  ambiance_score: 8,
  value_score: 7,
  notes: "Great pizza",
  visited_at: "2026-01-10",
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
};

export async function makeToken(
  overrides: Partial<{ member_id: string; family_id: string; name: string }> = {}
): Promise<string> {
  return sign(
    {
      member_id: overrides.member_id ?? TEST_MEMBER.id,
      family_id: overrides.family_id ?? TEST_MEMBER.family_id,
      name: overrides.name ?? TEST_MEMBER.name,
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_SECRET
  );
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}
```

**Step 2: Commit**

```
test: add JWT and fixture helpers for server tests
```

---

### Task 4: Auth Middleware Tests

**Files:**
- Create: `src/server/__tests__/middleware.test.ts`

**Step 1: Write the middleware tests**

```ts
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { TEST_SECRET, makeToken, authHeader } from "./helpers/auth";

function createTestApp() {
  const app = new Hono<{
    Bindings: Env;
    Variables: { jwtPayload: JwtPayload };
  }>();

  app.use("*", authMiddleware);
  app.get("/protected", (c) => {
    const payload = c.get("jwtPayload");
    return c.json({ data: payload });
  });

  return app;
}

function env(secret: string = TEST_SECRET) {
  return { DB: {} as D1Database, JWT_SECRET: secret };
}

describe("auth middleware", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const app = createTestApp();
    const res = await app.request("/protected", {}, env());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing authorization token");
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const app = createTestApp();
    const res = await app.request(
      "/protected",
      { headers: { Authorization: "Basic abc" } },
      env()
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 when JWT_SECRET is not configured", async () => {
    const app = createTestApp();
    const token = await makeToken();
    const res = await app.request(
      "/protected",
      { headers: authHeader(token) },
      env("")
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Server configuration error");
  });

  it("returns 401 for an invalid token", async () => {
    const app = createTestApp();
    const res = await app.request(
      "/protected",
      { headers: authHeader("not-a-real-token") },
      env()
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid or expired token");
  });

  it("sets jwtPayload and calls next for a valid token", async () => {
    const app = createTestApp();
    const token = await makeToken();
    const res = await app.request(
      "/protected",
      { headers: authHeader(token) },
      env()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.member_id).toBe("member-1");
    expect(body.data.family_id).toBe("family-1");
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/server/__tests__/middleware.test.ts`
Expected: 5 tests pass

**Step 3: Commit**

```
test: add auth middleware tests
```

---

### Task 5: Auth Route Tests

**Files:**
- Create: `src/server/__tests__/auth.test.ts`

**Step 1: Write auth route tests**

Test the full `app` (from `src/server/index.ts`) by passing mock env bindings to `app.request()`.

```ts
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
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/server/__tests__/auth.test.ts`
Expected: 7 tests pass

**Step 3: Commit**

```
test: add auth route tests
```

---

### Task 6: Restaurant Route Tests

**Files:**
- Create: `src/server/__tests__/restaurants.test.ts`

**Step 1: Write restaurant route tests**

```ts
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
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
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
```

**Step 2: Run tests**

Run: `npx vitest run src/server/__tests__/restaurants.test.ts`
Expected: 8 tests pass

**Step 3: Commit**

```
test: add restaurant route tests
```

---

### Task 7: Review Route Tests

**Files:**
- Create: `src/server/__tests__/reviews.test.ts`

**Step 1: Write review route tests**

```ts
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
    const body = await res.json();
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

  it("returns 400 for invalid score", async () => {
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
    const body = await res.json();
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
    const body = await res.json();
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
```

**Step 2: Run tests**

Run: `npx vitest run src/server/__tests__/reviews.test.ts`
Expected: 10 tests pass

**Step 3: Commit**

```
test: add review route tests
```

---

### Task 8: Run Full Suite and Final Commit

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: ~30 tests pass across 4 files

**Step 2: Verify no TypeScript errors**

Run: `npx tsc -b`
Expected: Clean build

**Step 3: Final commit**

```
test: complete server API test suite
```

**Step 4: Push**

Run: `git push`
