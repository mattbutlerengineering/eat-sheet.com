# Arctic OAuth Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Google Identity Services with Arctic-based provider-agnostic OAuth using standard redirect flow.

**Architecture:** Server-side OAuth with Arctic library. Provider registry pattern for easy multi-provider support. Standard redirect flow (GET /api/auth/:provider → provider → GET /api/auth/:provider/callback). Temp JWT tokens carry identity from callback to registration form. Existing JWT session system unchanged.

**Tech Stack:** Arctic (OAuth 2.0), Hono (server), React 19 (client), D1 (database), Cloudflare Workers (runtime)

**Design doc:** `docs/plans/2026-03-05-arctic-oauth-design.md`

---

## Task 1: Install Arctic and add DB migration

**Files:**
- Modify: `package.json`
- Create: `src/server/db/migrations/009_oauth_provider.sql`
- Modify: `src/server/db/schema.sql`

**Step 1: Install Arctic**

Run: `npm install arctic`

**Step 2: Create migration 009**

Create `src/server/db/migrations/009_oauth_provider.sql`:

```sql
ALTER TABLE members ADD COLUMN oauth_provider TEXT;
ALTER TABLE members ADD COLUMN oauth_id TEXT;

UPDATE members SET oauth_provider = 'google', oauth_id = google_id WHERE google_id IS NOT NULL;

CREATE UNIQUE INDEX idx_members_oauth ON members(oauth_provider, oauth_id);
DROP INDEX IF EXISTS idx_members_google_id;
```

**Step 3: Update schema.sql**

Add `oauth_provider TEXT` and `oauth_id TEXT` columns to the `members` table definition. Replace `google_id TEXT UNIQUE` with these two columns. Keep `email TEXT`. Replace `idx_members_google_id` index with `idx_members_oauth` unique index on `(oauth_provider, oauth_id)`.

**Step 4: Commit**

```
feat: add Arctic dependency and OAuth migration 009
```

---

## Task 2: Create provider registry

**Files:**
- Create: `src/server/utils/oauth-providers.ts`
- Modify: `src/server/types.ts` (update Env, Member types)

**Step 1: Update server types**

In `src/server/types.ts`:
- In `Env` interface: replace `GOOGLE_CLIENT_ID: string` with `GOOGLE_OAUTH_CLIENT_ID: string`, add `GOOGLE_OAUTH_CLIENT_SECRET: string` and `OAUTH_REDIRECT_BASE: string`
- In `Member` interface: replace `google_id: string | null` with `oauth_provider: string | null` and `oauth_id: string | null`

**Step 2: Create provider registry**

Create `src/server/utils/oauth-providers.ts`:

```typescript
import * as arctic from "arctic";
import type { Env } from "../types";

export interface OAuthProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

interface OAuthProvider {
  readonly createClient: (env: Env) => arctic.Google; // Union with other providers later
  readonly scopes: readonly string[];
  readonly usePKCE: boolean;
  readonly getProfile: (tokens: arctic.OAuth2Tokens) => OAuthProfile;
}

const providers: Record<string, OAuthProvider> = {
  google: {
    createClient: (env) =>
      new arctic.Google(
        env.GOOGLE_OAUTH_CLIENT_ID,
        env.GOOGLE_OAUTH_CLIENT_SECRET,
        `${env.OAUTH_REDIRECT_BASE}/api/auth/google/callback`
      ),
    scopes: ["openid", "profile", "email"],
    usePKCE: true,
    getProfile: (tokens) => {
      const claims = arctic.decodeIdToken(tokens.idToken()) as {
        sub: string;
        email: string;
        name: string;
      };
      return { id: claims.sub, email: claims.email, name: claims.name };
    },
  },
};

export function getProvider(name: string): OAuthProvider | undefined {
  return providers[name];
}

export function isValidProvider(name: string): boolean {
  return name in providers;
}
```

**Step 3: Commit**

```
feat: add OAuth provider registry with Google support
```

---

## Task 3: Write failing tests for OAuth redirect routes

**Files:**
- Modify: `src/server/__tests__/auth.test.ts`
- Modify: `src/server/__tests__/helpers/auth.ts` (add env helper update)

**Step 1: Update test env helper**

In `src/server/__tests__/auth.test.ts`, update the `env()` function:

```typescript
function env(db: D1Database) {
  return {
    DB: db,
    JWT_SECRET: TEST_SECRET,
    GOOGLE_OAUTH_CLIENT_ID: "test-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "test-client-secret",
    OAUTH_REDIRECT_BASE: "http://localhost:5173",
  };
}
```

**Step 2: Write tests for GET /api/auth/:provider**

Add new describe block:

```typescript
describe("GET /api/auth/:provider", () => {
  it("returns 404 for unknown provider", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/facebook", {}, env(db));
    expect(res.status).toBe(404);
  });

  it("redirects to Google for valid provider", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/google", {}, env(db));
    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toContain("accounts.google.com");
  });

  it("sets state and code_verifier cookies", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/google", {}, env(db));
    const cookies = res.headers.getSetCookie();
    expect(cookies.some(c => c.startsWith("oauth_state="))).toBe(true);
    expect(cookies.some(c => c.startsWith("oauth_code_verifier="))).toBe(true);
  });
});
```

**Step 3: Write tests for GET /api/auth/:provider/callback**

```typescript
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
```

**Step 4: Run tests to verify they fail**

Run: `npx vitest run src/server/__tests__/auth.test.ts`
Expected: FAIL — routes don't exist yet

**Step 5: Commit**

```
test: add failing tests for OAuth redirect routes
```

---

## Task 4: Implement OAuth redirect routes

**Files:**
- Modify: `src/server/routes/auth.ts`

**Step 1: Implement GET /api/auth/:provider**

Add before the existing `/join` route in `src/server/routes/auth.ts`:

```typescript
import * as arctic from "arctic";
import { getProvider, isValidProvider } from "../utils/oauth-providers";
import { getCookie, setCookie } from "hono/cookie";

auth.get("/:provider", async (c) => {
  const providerName = c.req.param("provider");

  // Skip non-OAuth routes that use :provider pattern
  if (["me", "members", "invite-code"].includes(providerName)) {
    return c.notFound();
  }

  if (!isValidProvider(providerName)) {
    return c.json({ error: "Unknown auth provider" }, 404);
  }

  const provider = getProvider(providerName)!;
  const client = provider.createClient(c.env);

  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const url = client.createAuthorizationURL(state, codeVerifier, provider.scopes);

  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  return c.redirect(url.toString());
});
```

**Step 2: Implement GET /api/auth/:provider/callback**

```typescript
auth.get("/:provider/callback", async (c) => {
  const providerName = c.req.param("provider");

  if (!isValidProvider(providerName)) {
    return c.json({ error: "Unknown auth provider" }, 404);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");
  const storedCodeVerifier = getCookie(c, "oauth_code_verifier");

  if (!code || !state || !storedState || state !== storedState || !storedCodeVerifier) {
    return c.json({ error: "Invalid OAuth callback" }, 400);
  }

  // Clear OAuth cookies
  setCookie(c, "oauth_state", "", { maxAge: 0, path: "/" });
  setCookie(c, "oauth_code_verifier", "", { maxAge: 0, path: "/" });

  const provider = getProvider(providerName)!;
  const client = provider.createClient(c.env);

  let profile;
  try {
    const tokens = await client.validateAuthorizationCode(code, storedCodeVerifier);
    profile = provider.getProfile(tokens);
  } catch {
    return c.json({ error: "OAuth token exchange failed" }, 401);
  }

  const db = c.env.DB;
  const member = await db
    .prepare("SELECT id, family_id, name, is_admin, email FROM members WHERE oauth_provider = ? AND oauth_id = ?")
    .bind(providerName, profile.id)
    .first<Member>();

  if (member) {
    const token = await sign(
      {
        member_id: member.id,
        family_id: member.family_id,
        name: member.name,
        is_admin: member.is_admin === 1,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
      },
      c.env.JWT_SECRET
    );

    const base = c.env.OAUTH_REDIRECT_BASE;
    return c.redirect(`${base}/?token=${encodeURIComponent(token)}`);
  }

  // New user — create temp registration token
  const tempToken = await sign(
    {
      oauth_provider: providerName,
      oauth_id: profile.id,
      email: profile.email,
      name: profile.name,
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    },
    c.env.JWT_SECRET
  );

  const base = c.env.OAUTH_REDIRECT_BASE;
  return c.redirect(`${base}/?register=true&token=${encodeURIComponent(tempToken)}`);
});
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run src/server/__tests__/auth.test.ts`
Expected: New redirect route tests pass (callback tests that mock token exchange may need adjustment — the state/cookie validation tests should pass)

**Step 4: Commit**

```
feat: add OAuth redirect and callback routes
```

---

## Task 5: Update /join endpoint for temp token flow

**Files:**
- Modify: `src/server/routes/auth.ts`
- Modify: `src/server/__tests__/auth.test.ts`

**Step 1: Write failing tests for updated /join**

Update the "POST /api/auth/join" test block. The endpoint now accepts a `registration_token` (temp JWT) instead of `google_id`. Update tests:

```typescript
describe("POST /api/auth/join", () => {
  it("returns 400 when registration_token is missing", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: "TEST123", name: "Matt" }),
    }, env(db));
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("registration token");
  });

  it("returns 401 for invalid registration_token", async () => {
    const { db } = createMockDb();
    const res = await app.request("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: "TEST123", name: "Matt", registration_token: "bad-token" }),
    }, env(db));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const { db } = createMockDb();
    const regToken = await makeToken({
      oauth_provider: "google",
      oauth_id: "google-123",
      email: "matt@gmail.com",
    });
    const res = await app.request("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: "TEST123", registration_token: regToken }),
    }, env(db));
    expect(res.status).toBe(400);
  });

  // ... similar updates for other join tests
});
```

Update `makeToken` in `src/server/__tests__/helpers/auth.ts` to accept OAuth fields:

```typescript
export async function makeToken(
  overrides: Partial<{
    member_id: string;
    family_id: string;
    name: string;
    is_admin: boolean;
    oauth_provider: string;
    oauth_id: string;
    email: string;
  }> = {}
): Promise<string> {
  return sign(
    {
      member_id: overrides.member_id ?? TEST_MEMBER.id,
      family_id: overrides.family_id ?? TEST_MEMBER.family_id,
      name: overrides.name ?? TEST_MEMBER.name,
      is_admin: overrides.is_admin ?? true,
      ...(overrides.oauth_provider && { oauth_provider: overrides.oauth_provider }),
      ...(overrides.oauth_id && { oauth_id: overrides.oauth_id }),
      ...(overrides.email && { email: overrides.email }),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_SECRET
  );
}
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/__tests__/auth.test.ts`
Expected: FAIL — /join still expects google_id

**Step 3: Update /join endpoint**

Rewrite the `/join` handler in `src/server/routes/auth.ts` to:
- Accept `registration_token` instead of `google_id`/`email`
- Verify the temp token JWT to extract `oauth_provider`, `oauth_id`, `email`
- Use `oauth_provider`/`oauth_id` for duplicate checking and INSERT/UPDATE
- All SQL queries use `oauth_provider`/`oauth_id` instead of `google_id`

```typescript
auth.post("/join", async (c) => {
  const body = await c.req.json<{ invite_code: string; name: string; registration_token: string }>();

  if (!body.registration_token) {
    return c.json({ error: "A registration token is required" }, 400);
  }

  let regPayload;
  try {
    regPayload = await verify(body.registration_token, c.env.JWT_SECRET) as {
      oauth_provider: string;
      oauth_id: string;
      email: string;
      name: string;
    };
  } catch {
    return c.json({ error: "Invalid or expired registration token" }, 401);
  }

  if (!body.invite_code || !body.name?.trim()) {
    return c.json({ error: "Invite code and name are required" }, 400);
  }

  const name = body.name.trim();
  const db = c.env.DB;
  const { oauth_provider, oauth_id, email } = regPayload;

  const family = await db
    .prepare("SELECT * FROM families WHERE invite_code = ?")
    .bind(body.invite_code)
    .first<Family>();

  if (!family) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  // Check oauth identity isn't already linked to a different member
  const existing = await db
    .prepare("SELECT id, family_id, name FROM members WHERE oauth_provider = ? AND oauth_id = ?")
    .bind(oauth_provider, oauth_id)
    .first<Member>();

  if (existing) {
    if (existing.family_id !== family.id || existing.name !== name) {
      return c.json({ error: "This account is already linked to another member" }, 409);
    }
  }

  let member = await db
    .prepare("SELECT * FROM members WHERE family_id = ? AND name = ?")
    .bind(family.id, name)
    .first<Member>();

  if (!member) {
    const memberCount = await db
      .prepare("SELECT COUNT(*) as count FROM members WHERE family_id = ?")
      .bind(family.id)
      .first<{ count: number }>();

    const isFirst = (memberCount?.count ?? 0) === 0;

    member = await db
      .prepare("INSERT INTO members (family_id, name, is_admin, oauth_provider, oauth_id, email) VALUES (?, ?, ?, ?, ?, ?) RETURNING *")
      .bind(family.id, name, isFirst ? 1 : 0, oauth_provider, oauth_id, email ?? null)
      .first<Member>();
  } else if (!member.oauth_id) {
    member = await db
      .prepare("UPDATE members SET oauth_provider = ?, oauth_id = ?, email = ? WHERE id = ? RETURNING *")
      .bind(oauth_provider, oauth_id, email ?? null, member.id)
      .first<Member>();
  }

  if (!member) {
    return c.json({ error: "Failed to create member" }, 500);
  }

  const token = await sign(
    {
      member_id: member.id,
      family_id: member.family_id,
      name: member.name,
      is_admin: member.is_admin === 1,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    },
    c.env.JWT_SECRET
  );

  return c.json({
    data: {
      token,
      member: {
        id: member.id,
        family_id: member.family_id,
        name: member.name,
        is_admin: member.is_admin === 1,
      },
    },
  });
});
```

Note: add `import { verify } from "hono/jwt"` at the top of the file.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/__tests__/auth.test.ts`
Expected: All tests pass

**Step 5: Commit**

```
feat: update /join to use registration token instead of google_id
```

---

## Task 6: Remove old Google auth code

**Files:**
- Delete: `src/server/utils/google-auth.ts`
- Modify: `src/server/routes/auth.ts` (remove POST /google route)
- Modify: `src/server/__tests__/auth.test.ts` (remove POST /google tests)
- Delete: `src/server/__tests__/helpers/google-auth.ts`

**Step 1: Remove POST /api/auth/google route**

In `src/server/routes/auth.ts`, delete the entire `auth.post("/google", ...)` handler (lines 12-77 approximately). Remove the `import { verifyGoogleToken }` line.

**Step 2: Remove google-auth utility**

Delete `src/server/utils/google-auth.ts`.

**Step 3: Update tests**

- Remove `import { mockVerifyGoogleToken, TEST_GOOGLE_CLIENT_ID, TEST_GOOGLE_USER }` from test file
- Remove entire `describe("POST /api/auth/google", ...)` block
- Remove `describe("POST /api/auth/join with google_id", ...)` block (replaced by Task 5 tests)
- Delete `src/server/__tests__/helpers/google-auth.ts`

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```
refactor: remove Google Identity Services server code
```

---

## Task 7: Update client — replace GIS with OAuth redirect buttons

**Files:**
- Delete: `src/client/components/GoogleSignInButton.tsx`
- Delete: `src/client/hooks/useGoogleAuth.ts`
- Delete: `src/client/types/google-gsi.d.ts`
- Create: `src/client/components/OAuthButton.tsx`
- Modify: `src/client/components/JoinScreen.tsx`
- Modify: `src/client/hooks/useAuth.ts`
- Modify: `src/client/App.tsx`
- Modify: `src/client/types.ts`
- Modify: `index.html`

**Step 1: Create OAuthButton component**

Create `src/client/components/OAuthButton.tsx`:

```tsx
const PROVIDER_CONFIG: Record<string, { label: string; icon: string; bg: string; hover: string }> = {
  google: {
    label: "Sign in with Google",
    icon: "G",
    bg: "bg-white",
    hover: "hover:bg-stone-100",
  },
};

interface OAuthButtonProps {
  readonly provider: string;
}

export function OAuthButton({ provider }: OAuthButtonProps) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return null;

  return (
    <a
      href={`/api/auth/${provider}`}
      className={`flex items-center justify-center gap-3 w-full py-3.5 ${config.bg} ${config.hover} text-stone-800 font-medium rounded-xl transition-all active:scale-[0.98]`}
    >
      <span className="text-lg font-bold">{config.icon}</span>
      <span>{config.label}</span>
    </a>
  );
}
```

**Step 2: Update client types**

In `src/client/types.ts`:
- Remove `GoogleUser` interface
- Remove `GoogleAuthResult` interface
- Add `OAuthUser` interface:

```typescript
export interface OAuthUser {
  readonly oauth_provider: string;
  readonly oauth_id: string;
  readonly email: string;
  readonly name: string;
}
```

**Step 3: Rewrite useAuth hook**

In `src/client/hooks/useAuth.ts`:
- Remove `googleAuth` and `googleRegister` callbacks
- Remove imports of `GoogleUser`, `GoogleAuthResult`
- Add `handleOAuthCallback` — checks URL for `?token=` (authenticated) or `?register=true&token=` (needs registration)
- Add `register` callback — posts to `/api/auth/join` with `registration_token`

```typescript
import { useState, useEffect, useCallback } from "react";
import type { AuthState, Member, OAuthUser } from "../types";

const STORAGE_KEY = "eat-sheet-auth";

function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed.token || !parsed.member) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAuth(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Decode JWT payload without verification (server already verified)
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) return {};
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth);
  const [loading, setLoading] = useState(true);
  const [pendingRegistration, setPendingRegistration] = useState<OAuthUser | null>(null);

  useEffect(() => {
    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const isRegister = params.get("register") === "true";

    if (token && !isRegister) {
      // Authenticated — token is a session JWT
      const payload = decodeJwtPayload(token);
      if (payload.member_id) {
        const state: AuthState = {
          token,
          member: {
            id: payload.member_id as string,
            family_id: payload.family_id as string,
            name: payload.name as string,
            is_admin: payload.is_admin as boolean,
          },
        };
        saveAuth(state);
        setAuth(state);
        // Clean URL
        window.history.replaceState({}, "", "/");
        setLoading(false);
        return;
      }
    }

    if (token && isRegister) {
      // Registration needed — token is a temp registration JWT
      const payload = decodeJwtPayload(token);
      if (payload.oauth_provider) {
        setPendingRegistration({
          oauth_provider: payload.oauth_provider as string,
          oauth_id: payload.oauth_id as string,
          email: payload.email as string,
          name: payload.name as string,
        });
        // Clean URL but keep registration state
        window.history.replaceState({}, "", "/");
      }
      setLoading(false);
      return;
    }

    // Normal load — validate stored auth
    const stored = loadAuth();
    if (!stored) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json() as Promise<{ data: Member }>;
      })
      .then((json) => {
        const verified: AuthState = { token: stored.token, member: json.data };
        saveAuth(verified);
        setAuth(verified);
      })
      .catch(() => {
        clearAuth();
        setAuth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (inviteCode: string, name: string, registrationToken: string) => {
    const res = await fetch("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invite_code: inviteCode,
        name,
        registration_token: registrationToken,
      }),
    });

    const json = (await res.json()) as { data?: { token: string; member: Member }; error?: string };

    if (!res.ok || !json.data) {
      throw new Error(json.error || "Failed to join");
    }

    const state: AuthState = { token: json.data.token, member: json.data.member };
    saveAuth(state);
    setAuth(state);
    setPendingRegistration(null);
    return state;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
    setPendingRegistration(null);
  }, []);

  const updateName = useCallback((name: string) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const updated: AuthState = { ...prev, member: { ...prev.member, name } };
      saveAuth(updated);
      return updated;
    });
  }, []);

  return { auth, loading, logout, updateName, register, pendingRegistration };
}
```

**Step 4: Rewrite JoinScreen**

Replace `src/client/components/JoinScreen.tsx`:
- Remove all Google-specific imports and types
- Import `OAuthButton` instead of `GoogleSignInButton`
- Props: `onRegister`, `pendingRegistration` (OAuthUser | null), `registrationToken`
- Sign-in screen: show `<OAuthButton provider="google" />`
- Registration screen: shown when `pendingRegistration` is set, show invite code + name form

```tsx
import { useState } from "react";
import { Slurms } from "./Slurms";
import { OAuthButton } from "./OAuthButton";
import { SLURMS_QUOTES } from "../utils/personality";
import type { OAuthUser } from "../types";

interface JoinScreenProps {
  readonly pendingRegistration: OAuthUser | null;
  readonly registrationToken: string | null;
  readonly onRegister: (inviteCode: string, name: string, registrationToken: string) => Promise<unknown>;
}

// ... keep FLOATING_FOOD, INPUT_CLASS, FloatingFood, Branding unchanged ...

export function JoinScreen({ pendingRegistration, registrationToken, onRegister }: JoinScreenProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState(pendingRegistration?.name ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !name.trim() || !registrationToken) return;

    setError("");
    setSubmitting(true);
    try {
      await onRegister(inviteCode.trim(), name.trim(), registrationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-stone-950 relative overflow-hidden">
      <FloatingFood />

      <div className="w-full max-w-sm relative z-10">
        <Branding />

        {!pendingRegistration && (
          <div className="space-y-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <OAuthButton provider="google" />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <p className="text-center text-stone-600 text-sm mt-4">
              Ask your family for the invite code
            </p>
          </div>
        )}

        {pendingRegistration && (
          <form onSubmit={handleRegisterSubmit} className="space-y-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="bg-stone-900 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-lg">
                {pendingRegistration.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-stone-50 text-sm font-medium">{pendingRegistration.name}</p>
                <p className="text-stone-500 text-xs">{pendingRegistration.email}</p>
              </div>
            </div>

            {/* Invite Code + Name inputs — same as current register screen */}
            {/* Submit button + Back button */}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
```

**Step 5: Update App.tsx**

```typescript
export function App() {
  const { auth, loading, logout, updateName, register, pendingRegistration } = useAuth();

  // ... share page logic unchanged ...

  if (!auth) {
    // Get registration token from URL if present (before useAuth cleans it)
    const params = new URLSearchParams(window.location.search);
    const registrationToken = params.get("token");

    return (
      <JoinScreen
        pendingRegistration={pendingRegistration}
        registrationToken={registrationToken}
        onRegister={register}
      />
    );
  }
  // ... rest unchanged
}
```

Note: The registration token needs to be captured before useAuth cleans the URL. Move token extraction into App.tsx or store it in useAuth state alongside pendingRegistration.

**Step 6: Remove GIS script from index.html**

In `index.html`, delete:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**Step 7: Delete old files**

- Delete `src/client/components/GoogleSignInButton.tsx`
- Delete `src/client/hooks/useGoogleAuth.ts`
- Delete `src/client/types/google-gsi.d.ts`

**Step 8: Run build and tests**

Run: `npm run build && npx vitest run`
Expected: Build succeeds, all tests pass

**Step 9: Commit**

```
feat: replace Google Identity Services with OAuth redirect flow on client
```

---

## Task 8: Update wrangler config and clean up env references

**Files:**
- Modify: `wrangler.toml` (document new env vars in comments)
- Verify: No remaining references to `GOOGLE_CLIENT_ID` or `VITE_GOOGLE_CLIENT_ID`

**Step 1: Grep for stale references**

Search for `GOOGLE_CLIENT_ID`, `google_id`, `GoogleUser`, `GoogleAuthResult`, `verifyGoogleToken`, `google-auth`, `gsi` across the codebase. Fix any remaining references.

**Step 2: Run full test + build**

Run: `npx vitest run && npm run build`
Expected: All pass, no type errors

**Step 3: Commit**

```
chore: clean up stale Google auth references
```

---

## Task 9: Final verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Build**

Run: `npm run build`
Expected: Clean build

**Step 3: Local dev smoke test**

Run: `npm run dev` + `npx wrangler dev`

Verify:
- No "Use invite code only" option
- No Google Identity Services popup
- "Sign in with Google" button links to `/api/auth/google`
- Clicking it redirects to Google OAuth consent screen (will fail locally without real credentials — that's expected)

**Step 4: Final commit if any adjustments needed**

```
chore: final verification of Arctic OAuth migration
```
