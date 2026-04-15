import { describe, it, expect, vi, beforeEach } from "vitest";
import { findOrCreateUser, buildJwtPayload } from "../service";
import type { UserRow, TenantMemberRow } from "../repository";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "user-1",
    email: "alice@example.com",
    name: "Alice",
    avatar_url: "https://example.com/avatar.jpg",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeDb(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}): D1Database {
  const first = vi.fn();
  const run = vi.fn().mockResolvedValue({ success: true });
  const all = vi.fn();
  const prepared: Record<string, ReturnType<typeof vi.fn>> = {};

  const prepare = vi.fn((sql: string) => {
    const stmt = {
      bind: vi.fn().mockReturnThis(),
      first,
      run,
      all,
    };
    return stmt;
  });

  return {
    prepare,
    ...overrides,
  } as unknown as D1Database;
}

// ---------------------------------------------------------------------------
// findOrCreateUser
// ---------------------------------------------------------------------------

describe("findOrCreateUser", () => {
  it("returns existing user when found by email", async () => {
    const existingUser = makeUserRow();
    const first = vi.fn().mockResolvedValue(existingUser);
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first,
      }),
    } as unknown as D1Database;

    const result = await findOrCreateUser(db, {
      id: "google-123",
      email: "alice@example.com",
      name: "Alice",
      picture: null,
    });

    expect(result).toEqual(existingUser);
    // Should only SELECT, not INSERT
    expect(db.prepare).toHaveBeenCalledTimes(1);
    const firstCall = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall).toBeDefined();
    expect((firstCall as unknown[])[0]).toContain("SELECT");
  });

  it("creates a new user when none exists by email", async () => {
    const newUser = makeUserRow({ id: "generated-id" });
    const first = vi.fn()
      .mockResolvedValueOnce(null)     // findUserByEmail returns null
      .mockResolvedValueOnce(newUser); // second call after insert
    const run = vi.fn().mockResolvedValue({ success: true });

    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first,
        run,
      }),
    } as unknown as D1Database;

    const result = await findOrCreateUser(db, {
      id: "google-456",
      email: "bob@example.com",
      name: "Bob",
      picture: "https://example.com/bob.jpg",
    });

    expect(result).toEqual(newUser);
    // SELECT → INSERT → SELECT again
    const prepareCalls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    const sqls = prepareCalls.map((c: unknown[]) => (c[0] as string).trim().toUpperCase());
    expect(sqls.some((s: string) => s.startsWith("INSERT"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildJwtPayload
// ---------------------------------------------------------------------------

describe("buildJwtPayload", () => {
  const user = makeUserRow();

  it("returns null tenantId and roleId when user has no tenants", async () => {
    const all = vi.fn().mockResolvedValue({ results: [] });
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all,
      }),
    } as unknown as D1Database;

    const payload = await buildJwtPayload(db, user);

    expect(payload.sub).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.name).toBe(user.name);
    expect(payload.tenantId).toBeNull();
    expect(payload.roleId).toBeNull();
    expect(payload.permissions).toEqual([]);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("includes tenantId, roleId, and parsed permissions for first tenant", async () => {
    const memberRow: TenantMemberRow = {
      tenant_id: "tenant-abc",
      role_id: "role-xyz",
      permissions: JSON.stringify(["menus:read", "reservations:write"]),
    };
    const all = vi.fn().mockResolvedValue({ results: [memberRow] });
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all,
      }),
    } as unknown as D1Database;

    const payload = await buildJwtPayload(db, user);

    expect(payload.tenantId).toBe("tenant-abc");
    expect(payload.roleId).toBe("role-xyz");
    expect(payload.permissions).toEqual(["menus:read", "reservations:write"]);
  });

  it("sets expiry approximately 7 days from now", async () => {
    const all = vi.fn().mockResolvedValue({ results: [] });
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all,
      }),
    } as unknown as D1Database;

    const before = Math.floor(Date.now() / 1000);
    const payload = await buildJwtPayload(db, user);
    const after = Math.floor(Date.now() / 1000);

    const sevenDays = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDays);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDays + 1);
  });
});
