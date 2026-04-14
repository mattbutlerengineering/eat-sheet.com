# Testing Patterns

**Analysis Date:** 2026-04-11

## Test Framework

**Runner:**
- **Vitest** v4.0.18 - Unit/integration tests
- **Playwright** v1.58.2 - E2E tests

**Config:** `vitest.config.ts`
```typescript
globals: true,           // describe/it globally available
environment: "node",    // Node.js test environment
include: "src/**/__tests__/**/*.test.{ts,tsx}"
```

**Run Commands:**
```bash
npm test                # Run all vitest tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage with v8 provider
npm test:e2e           # Run playwright tests
```

## Test File Organization

**Location:**
- Server tests: `src/server/__tests__/*.test.ts`
- E2E tests: `tests/e2e/*.spec.ts`
- Test helpers: `src/server/__tests__/helpers/`

**Naming:**
- Test files: `*.test.ts` suffix
- Test directories: `__tests__` folder

**Structure:**
```
src/server/__tests__/
├── auth.test.ts
├── members.test.ts
├── roles.test.ts
├── reservations.test.ts
├── waitlist.test.ts
├── guests.test.ts
├── floor-plans.test.ts
├── roles.test.ts
├── dashboard.test.ts
├── service-periods.test.ts
├── tenants.test.ts
├── assignements.test.ts
└── helpers/
    ├── auth.ts         # Token helpers
    └── mock-db.ts     # D1 mock
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('POST /api/auth/refresh', () => {
  it('returns new token (200)', async () => {
    // Test setup
    const { db } = createMockDb();
    const { app, bindings } = makeApp(db);

    // Execute
    const token = await makeToken({ userId: TEST_USER.id, tenantId: TEST_TENANT.id });
    const res = await app.request(
      '/api/auth/refresh',
      { method: 'POST', headers: authHeader(token) },
      bindings
    );

    // Assert
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { token: string } };
    expect(body.success).toBe(true);
  });
});
```

**Patterns:**
- Use `describe()` blocks to group endpoint tests
- Use `it()` with descriptive name for each case
- Arrange-Act-Assert structure inside each test

## Mocking

**Framework:** Custom mock implementations (no external mocking library)

**D1 Database Mock:**
- Location: `src/server/__tests__/helpers/mock-db.ts`
- Pattern: SQL key matching via partial string match
```typescript
export function createMockDb(config: MockDbConfig = {}) {
  const createStatement = (sql: string): MockStatement => ({
    bind(...args) { return stmt; },
    async first<T>(): Promise<T | null> {
      const key = Object.keys(config.first ?? {}).find((k) => sql.includes(k));
      return (key ? config.first![key] : null) as T | null;
    },
    async all<T>(): Promise<{ results: T[] }> {
      const key = Object.keys(config.all ?? {}).find((k) => sql.includes(k));
      return { results: (key ? config.all![key] : []) as T[] };
    },
    async run() { /* ... */ }
  });
  return { db: db as D1Database, calls };
}
```

**What to Mock:**
- D1 database (`config.first`, `config.all`, `config.run`)
- R2 bucket (empty object in test bindings)
- Environment variables (JWT_SECRET, etc.)

**What NOT to Mock:**
- JWT functions (use real `hono/jwt` with test secret)
- Zod validation (real validation library)

## Fixtures and Factories

**Test Data:**
- Location: `src/server/__tests__/helpers/auth.ts`
```typescript
export const TEST_SECRET = 'test-jwt-secret-for-tests';

export const TEST_TENANT = {
  id: 'tenant-1',
  name: "Mario's Trattoria",
  slug: 'marios-trattoria',
  timezone: 'America/New_York',
  settings: null,
  created_at: '2026-01-01T00:00:00Z',
};

export const TEST_USER = {
  id: 'user-1',
  email: 'matt@example.com',
  name: 'Matt',
  // ...
};

export async function makeToken(overrides): Promise<string> {
  return sign({ /* payload */ }, TEST_SECRET);
}

export function authHeader(token): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
```

**Token Helper Usage:**
```typescript
const token = await makeToken({ userId: TEST_USER.id, tenantId: TEST_TENANT.id });
const res = await app.request('/api/auth/me', { headers: authHeader(token) }, bindings);
```

## Coverage

**Requirements:** None enforced (no CI gate)

**View Coverage:**
```bash
npm run test:coverage
```

Config excludes:
- `src/**/__tests__/**` - Test files
- `src/**/*.d.ts` - Type declarations

**Reporter:** `text` + `html`

## Test Types

**Unit Tests:**
- Service logic (e.g., `waitlist-service.ts` functions)
- Pure validation (Zod schemas)

**Integration Tests:**
- Route handlers with mock DB
- Full request/response cycle (using `app.request()`)
- Auth middleware enforcement during tests

**E2E Tests:**
- Location: `tests/e2e/`
- Framework: Playwright
- Examples: `smoke.spec.ts`, `restaurant-list.spec.ts`, `onboarding.spec.ts`

**E2E Smoke Test Example:**
```typescript
test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('http://localhost:8788/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.status).toBe('ok');
});
```

## Common Patterns

**Async Testing:**
- Vitest handles async natively - no special wrapper needed
```typescript
it('returns new token (200)', async () => {
  const res = await app.request(...);
  // ...
});
```

**Error Testing:**
- Test status codes (400, 401, 403, 404)
```typescript
it('returns 404 when user not found', async () => {
  expect(res.status).toBe(404);
  const body = await res.json() as { success: boolean; error: string };
  expect(body.success).toBe(false);
});
```

**Testing Auth Protection:**
```typescript
it('rejects without auth (401)', async () => {
  const { db } = createMockDb();
  const { app, bindings } = makeApp(db);
  const res = await app.request('/api/auth/me', {}, bindings);
  expect(res.status).toBe(401);
});
```

---

*Testing analysis: 2026-04-11*