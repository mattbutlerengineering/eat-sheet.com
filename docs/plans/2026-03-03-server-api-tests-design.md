# Server API Tests Design

## Approach

Vitest + Hono `app.request()` with mocked D1 database.

- No HTTP server needed — call routes directly via Hono's test helper
- Mock D1 implements `prepare().bind().first()/all()/run()` and `batch()`
- JWT helper generates valid/invalid tokens for auth tests

## File Structure

```
src/server/__tests__/
  helpers/
    mock-db.ts         # D1 mock factory
    auth.ts            # JWT token generator for tests
  auth.test.ts         # Auth routes (join, me, members)
  restaurants.test.ts  # Restaurant CRUD + authorization
  reviews.test.ts      # Review CRUD + authorization
  middleware.test.ts   # Auth middleware edge cases
```

## Test Coverage

### Auth routes (~8 tests)

- Join with valid invite code -> 200 + token
- Join with invalid code -> 401
- Join with missing name -> 400
- GET /me with valid token -> member data
- GET /me with no token -> 401
- GET /members -> family member list

### Restaurant routes (~8 tests)

- List restaurants -> returns with avg scores
- Get detail -> returns with reviews
- Create restaurant -> 201
- Create without auth -> 401
- Delete by creator -> success + cascades reviews
- Delete by non-creator -> 403
- Delete nonexistent -> 404

### Review routes (~8 tests)

- Create review -> 201
- Create duplicate -> 409
- Update own review -> 200
- Update someone else's -> 403/404
- Delete own review -> 200
- Delete someone else's -> 404
- Invalid score (0 or 11) -> 400

### Auth middleware (~4 tests)

- Missing Authorization header -> 401
- Invalid token -> 401
- Missing JWT_SECRET -> 500
- Valid token -> sets payload, calls next

## Decisions

- **Why mock D1**: SQL is simple (no complex joins/CTEs). Mocking keeps tests fast and dependency-free. Can add Miniflare integration tests later.
- **Why Vitest**: Ships with Vite ecosystem, zero-config for TypeScript, fast.
- **Why `app.request()`**: Hono's built-in test helper — tests the full middleware chain without HTTP overhead.
