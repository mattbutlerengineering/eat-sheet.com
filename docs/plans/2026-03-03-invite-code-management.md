# Invite Code Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow the family admin (first member) to view and regenerate the invite code from within the app.

**Architecture:** Add `is_admin` column to members table, include it in JWT payload, add admin-only API endpoints for viewing/regenerating codes, and add a simple UI panel to the restaurant list header.

**Tech Stack:** Hono API, Cloudflare D1 (SQLite), React, TypeScript, Vitest

---

### Task 1: Schema Migration

**Files:**
- Create: `src/server/db/migrations/001_add_is_admin.sql`
- Modify: `src/server/db/schema.sql`
- Modify: `src/server/db/seed.sql`

**Step 1: Create migration file**

Create `src/server/db/migrations/001_add_is_admin.sql`:

```sql
ALTER TABLE members ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

UPDATE members SET is_admin = 1
WHERE id = (
  SELECT id FROM members
  WHERE family_id = (SELECT id FROM families LIMIT 1)
  ORDER BY created_at ASC
  LIMIT 1
);
```

**Step 2: Update schema.sql to include is_admin for fresh installs**

In `src/server/db/schema.sql`, update the `members` CREATE TABLE to add `is_admin`:

```sql
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(family_id, name)
);
```

**Step 3: Update seed.sql to make seeded member an admin**

Replace `src/server/db/seed.sql` with:

```sql
INSERT OR IGNORE INTO families (id, name, invite_code)
VALUES ('family001', 'The Butlers', 'EATSHEET2024');
```

(Remove any member seed — members are created via the join flow. The first joiner gets admin automatically.)

**Step 4: Commit**

```
feat: add is_admin column to members schema
```

---

### Task 2: Update Server Types

**Files:**
- Modify: `src/server/types.ts`

**Step 1: Add is_admin to Member interface**

Add `readonly is_admin: number;` after `name` in the `Member` interface.

**Step 2: Add is_admin to JwtPayload interface**

Add `readonly is_admin: boolean;` after `name` in the `JwtPayload` interface.

**Step 3: Commit**

```
feat: add is_admin to server types
```

---

### Task 3: Update Auth Routes — Join and JWT

**Files:**
- Modify: `src/server/routes/auth.ts`

**Step 1: Update join route to handle is_admin**

After finding/creating a member, the join route must:
- When creating a NEW member: check if any other members exist in the family. If not, set `is_admin = 1`.
- Include `is_admin` in the JWT payload and the returned member data.

Replace the INSERT query (line ~37) with:

```ts
    const memberCount = await db
      .prepare("SELECT COUNT(*) as count FROM members WHERE family_id = ?")
      .bind(family.id)
      .first<{ count: number }>();

    const isFirst = (memberCount?.count ?? 0) === 0;

    const result = await db
      .prepare("INSERT INTO members (family_id, name, is_admin) VALUES (?, ?, ?) RETURNING *")
      .bind(family.id, name, isFirst ? 1 : 0)
      .first<Member>();
    member = result;
```

Update the JWT sign call to include `is_admin`:

```ts
  const token = await sign(
    {
      member_id: member.id,
      family_id: member.family_id,
      name: member.name,
      is_admin: member.is_admin === 1,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    },
    secret
  );
```

Update the returned member data to include `is_admin`:

```ts
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
```

**Step 2: Update GET /me to include is_admin**

Change the SQL in the `/me` route to select `is_admin`:

```ts
  const member = await db
    .prepare("SELECT id, family_id, name, is_admin FROM members WHERE id = ?")
    .bind(payload.member_id)
    .first<Member>();
```

And update the response to include it:

```ts
  return c.json({
    data: {
      id: member.id,
      family_id: member.family_id,
      name: member.name,
      is_admin: member.is_admin === 1,
    },
  });
```

**Step 3: Commit**

```
feat: include is_admin in join flow and JWT payload
```

---

### Task 4: Add Admin-Only Invite Code Endpoints

**Files:**
- Modify: `src/server/routes/auth.ts`

**Step 1: Add GET /invite-code endpoint**

After the existing `/members` route, add:

```ts
auth.get("/invite-code", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const db = c.env.DB;
  const family = await db
    .prepare("SELECT invite_code FROM families WHERE id = ?")
    .bind(payload.family_id)
    .first<{ invite_code: string }>();

  if (!family) {
    return c.json({ error: "Family not found" }, 404);
  }

  return c.json({ data: { invite_code: family.invite_code } });
});
```

**Step 2: Add POST /regenerate-code endpoint**

```ts
auth.post("/regenerate-code", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const db = c.env.DB;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  const family = await db
    .prepare("UPDATE families SET invite_code = ? WHERE id = ? RETURNING invite_code")
    .bind(code, payload.family_id)
    .first<{ invite_code: string }>();

  if (!family) {
    return c.json({ error: "Family not found" }, 404);
  }

  return c.json({ data: { invite_code: family.invite_code } });
});
```

Note: The character set excludes ambiguous chars (0/O, 1/I/L) for readability.

**Step 3: Commit**

```
feat: add admin-only invite code view and regenerate endpoints
```

---

### Task 5: Tests for New Endpoints

**Files:**
- Modify: `src/server/__tests__/auth.test.ts`
- Modify: `src/server/__tests__/helpers/auth.ts`

**Step 1: Update test fixtures**

In `src/server/__tests__/helpers/auth.ts`:

Add `is_admin: 1` to `TEST_MEMBER` and `is_admin: 0` to `TEST_MEMBER_2`.

Update `makeToken` to include `is_admin`:

```ts
export async function makeToken(
  overrides: Partial<{ member_id: string; family_id: string; name: string; is_admin: boolean }> = {}
): Promise<string> {
  return sign(
    {
      member_id: overrides.member_id ?? TEST_MEMBER.id,
      family_id: overrides.family_id ?? TEST_MEMBER.family_id,
      name: overrides.name ?? TEST_MEMBER.name,
      is_admin: overrides.is_admin ?? true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_SECRET
  );
}
```

**Step 2: Add tests for GET /invite-code**

Add to `src/server/__tests__/auth.test.ts`:

```ts
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
```

**Step 3: Add tests for POST /regenerate-code**

```ts
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
```

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (original 31 + 4 new = 35)

**Step 5: Commit**

```
test: add invite code management tests
```

---

### Task 6: Update Client Types

**Files:**
- Modify: `src/client/types.ts`

**Step 1: Add is_admin to Member**

Add `readonly is_admin: boolean;` to the `Member` interface.

**Step 2: Commit**

```
feat: add is_admin to client Member type
```

---

### Task 7: Invite Code UI Component

**Files:**
- Create: `src/client/components/InviteCodePanel.tsx`

**Step 1: Create the InviteCodePanel component**

```tsx
import { useState } from "react";
import { useApi } from "../hooks/useApi";

interface InviteCodePanelProps {
  readonly token: string;
  readonly onClose: () => void;
}

export function InviteCodePanel({ token, onClose }: InviteCodePanelProps) {
  const { get, post } = useApi(token);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useState(() => {
    get<{ invite_code: string }>("/api/auth/invite-code")
      .then((data) => setCode(data.invite_code))
      .finally(() => setLoading(false));
  });

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setConfirmRegen(false);
    setLoading(true);
    const data = await post<{ invite_code: string }>("/api/auth/regenerate-code", {});
    setCode(data.invite_code);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-stone-900 border-t border-stone-700 rounded-t-2xl p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-stone-50">Invite Code</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">
            Close
          </button>
        </div>

        {loading ? (
          <div className="shimmer h-12 rounded-xl" />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <code className="flex-1 bg-stone-800 text-orange-400 font-mono text-xl font-bold text-center py-3 rounded-xl tracking-widest">
                {code}
              </code>
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Share this code with family members so they can join.
            </p>

            {confirmRegen ? (
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Confirm Regenerate
                </button>
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="flex-1 py-2.5 bg-stone-800 text-stone-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRegen(true)}
                className="w-full text-xs text-stone-500 hover:text-red-400 transition-colors py-2"
              >
                Regenerate code (invalidates current code)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

IMPORTANT: The `useState(() => { ... })` pattern above is intentional — it's a React 19 initializer that runs once. If this doesn't work in the project's React version, change to a `useEffect` with empty deps.

**Step 2: Commit**

```
feat: add InviteCodePanel component
```

---

### Task 8: Wire Up UI in RestaurantList

**Files:**
- Modify: `src/client/components/RestaurantList.tsx`

**Step 1: Add invite code button to header (admin only)**

Add import at top:
```ts
import { InviteCodePanel } from "./InviteCodePanel";
```

Add state for showing the panel:
```ts
const [showInviteCode, setShowInviteCode] = useState(false);
```

In the header, between the member name and the "Leave" button, add (only for admin):

```tsx
{member.is_admin && (
  <button
    onClick={() => setShowInviteCode(true)}
    className="text-xs text-orange-500/70 hover:text-orange-400 transition-colors"
  >
    Invite
  </button>
)}
```

At the bottom of the component (before the closing `</div>`), add:

```tsx
{showInviteCode && (
  <InviteCodePanel token={token} onClose={() => setShowInviteCode(false)} />
)}
```

**Step 2: Run the build to check for type errors**

Run: `npx tsc -b`
Expected: Clean build

**Step 3: Commit**

```
feat: add invite code button to restaurant list header
```

---

### Task 9: Run Full Suite and Push

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: 35 tests pass

**Step 2: Type check**

Run: `npx tsc -b`
Expected: Clean

**Step 3: Final commit (if any remaining changes)**

```
feat: complete invite code management feature
```

**Step 4: Push**

Run: `git push`
