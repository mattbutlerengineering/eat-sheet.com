import { describe, it, expect, vi, beforeEach } from "vitest";
import { nanoid } from "nanoid";

vi.mock("nanoid", () => ({
  nanoid: vi.fn(),
}));

import {
  createVenueWithTheme,
  deleteVenue,
  findTenantById,
  findTenantBySlug,
  findVenueTheme,
  updateTenant,
  updateVenueTheme,
} from "../repository";

const mockNanoid = nanoid as ReturnType<typeof vi.fn>;

function mockDb() {
  const stmt = {
    bind: vi.fn(function (this: typeof stmt) {
      return this;
    }),
    first: vi.fn(async () => null),
    run: vi.fn(async () => ({ success: true })),
    all: vi.fn(async () => ({ results: [] })),
  };

  return {
    prepare: vi.fn(() => ({ ...stmt, bind: vi.fn(() => stmt) })),
    batch: vi.fn(async () => []),
  } as unknown as D1Database;
}

const validData = {
  name: "Verde Kitchen",
  slug: "verde-kitchen",
  type: "casual",
  cuisines: '["Italian"]',
  addressLine1: "123 Main St",
  addressLine2: "",
  city: "San Francisco",
  state: "CA",
  zip: "94102",
  country: "US",
  timezone: "America/Los_Angeles",
  phone: "+1 555-0100",
  website: "https://verde.com",
  logoUrl: "/api/onboarding/logos/user-1/test.png",
  accent: "#2d4a2d",
  accentHover: "#1a3a1a",
  source: "extracted" as const,
  userId: "user-1",
  ownerRoleId: "role_owner",
};

describe("createVenueWithTheme", () => {
  beforeEach(() => {
    mockNanoid
      .mockReset()
      .mockReturnValueOnce("tenant-id")
      .mockReturnValueOnce("theme-id")
      .mockReturnValueOnce("member-id");
  });

  it("batches three INSERT statements", async () => {
    const db = mockDb();

    await createVenueWithTheme(db, validData);

    expect(db.batch).toHaveBeenCalledOnce();
    const batchArgs = (db.batch as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(batchArgs).toHaveLength(3);
  });

  it("includes id in tenant_members INSERT", async () => {
    const db = mockDb();

    await createVenueWithTheme(db, validData);

    // The third prepare call is for tenant_members
    const prepareArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    const memberSql = prepareArgs[2]![0] as string;
    expect(memberSql).toContain("INSERT INTO tenant_members");
    expect(memberSql).toContain("(id,");
  });

  it("returns generated tenantId and themeId", async () => {
    const db = mockDb();

    const result = await createVenueWithTheme(db, validData);

    expect(result.tenantId).toBe("tenant-id");
    expect(result.themeId).toBe("theme-id");
  });

  it("sets onboarding_completed to 1", async () => {
    const db = mockDb();

    await createVenueWithTheme(db, validData);

    const prepareArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    const tenantSql = prepareArgs[0]![0] as string;
    expect(tenantSql).toContain("onboarding_completed");
    // The SQL has "1" as a literal, not a parameter
    expect(tenantSql).toMatch(/,\s*1,/);
  });

  it("passes brand source to venue_themes INSERT", async () => {
    const db = mockDb();

    await createVenueWithTheme(db, validData);

    const prepareArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    const themeSql = prepareArgs[1]![0] as string;
    // Source should be a parameter (?) not hardcoded 'manual'
    expect(themeSql).not.toContain("'manual'");
    expect(themeSql).toContain("source");
  });
});

const TENANT_ROW = {
  id: "t-1",
  name: "Test Venue",
  slug: "test-venue",
  type: "casual",
  cuisines: '["Italian"]',
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  zip: null,
  country: "US",
  timezone: "America/New_York",
  phone: null,
  website: null,
  logo_url: null,
  onboarding_completed: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const THEME_ROW = {
  id: "th-1",
  tenant_id: "t-1",
  accent: "#c49a2a",
  accent_hover: "#a07d1f",
  surface: null,
  surface_elevated: null,
  text_primary: null,
  source: "manual",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function mockDbWithResult(result: unknown) {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(result),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  return {
    prepare: vi.fn(() => stmt),
    _stmt: stmt,
  } as unknown as D1Database & { _stmt: typeof stmt };
}

describe("findTenantById", () => {
  it("returns the tenant row when found", async () => {
    const db = mockDbWithResult(TENANT_ROW);
    const result = await findTenantById(db, "t-1");
    expect(result).toEqual(TENANT_ROW);
    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT * FROM tenants WHERE id = ?",
    );
  });

  it("returns null when not found", async () => {
    const db = mockDbWithResult(null);
    const result = await findTenantById(db, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("findTenantBySlug", () => {
  it("returns the tenant row when found", async () => {
    const db = mockDbWithResult(TENANT_ROW);
    const result = await findTenantBySlug(db, "test-venue");
    expect(result).toEqual(TENANT_ROW);
    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT * FROM tenants WHERE slug = ?",
    );
  });

  it("returns null when not found", async () => {
    const db = mockDbWithResult(null);
    const result = await findTenantBySlug(db, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("findVenueTheme", () => {
  it("returns the theme row when found", async () => {
    const db = mockDbWithResult(THEME_ROW);
    const result = await findVenueTheme(db, "t-1");
    expect(result).toEqual(THEME_ROW);
    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT * FROM venue_themes WHERE tenant_id = ?",
    );
  });

  it("returns null when not found", async () => {
    const db = mockDbWithResult(null);
    const result = await findVenueTheme(db, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("updateTenant", () => {
  it("builds UPDATE query with provided fields", async () => {
    const db = mockDbWithResult(null);
    await updateTenant(db, "t-1", { name: "New Name", city: "LA" });

    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(sql).toContain("UPDATE tenants SET");
    expect(sql).toContain("name = ?");
    expect(sql).toContain("city = ?");
    expect(sql).toContain("updated_at = ?");
    expect(sql).toContain("WHERE id = ?");
  });

  it("skips update when no fields provided", async () => {
    const db = mockDbWithResult(null);
    await updateTenant(db, "t-1", {});
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it("filters out undefined values", async () => {
    const db = mockDbWithResult(null);
    await updateTenant(db, "t-1", { name: "X", city: undefined });

    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(sql).toContain("name = ?");
    expect(sql).not.toContain("city = ?");
  });
});

describe("updateVenueTheme", () => {
  it("builds UPDATE query with provided fields", async () => {
    const db = mockDbWithResult(null);
    await updateVenueTheme(db, "t-1", { accent: "#ff0000" });

    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(sql).toContain("UPDATE venue_themes SET");
    expect(sql).toContain("accent = ?");
    expect(sql).toContain("updated_at = ?");
    expect(sql).toContain("WHERE tenant_id = ?");
  });

  it("skips update when no fields provided", async () => {
    const db = mockDbWithResult(null);
    await updateVenueTheme(db, "t-1", {});
    expect(db.prepare).not.toHaveBeenCalled();
  });
});

describe("deleteVenue", () => {
  it("deletes tenant and all related records in batch", async () => {
    const db = mockDb();
    (db.batch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { success: true },
      { success: true },
      { success: true },
      { success: true },
      { success: true, meta: { changes: 1 } },
    ]);
    const result = await deleteVenue(db, "tenant-1");

    expect(result).toBe(true);
    expect(db.batch).toHaveBeenCalledOnce();

    // Verify batch contains deletes in FK-safe order
    const batchCalls = (db.batch as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(batchCalls.length).toBe(5); // floor_plans, tenant_members, roles, venue_themes, tenants
  });

  it("returns false when tenant not found", async () => {
    const db = mockDb();
    // Override batch to return results where tenants delete affected 0 rows
    (db.batch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { success: true }, // floor_plans
      { success: true }, // tenant_members
      { success: true }, // roles
      { success: true }, // venue_themes
      { success: true, meta: { changes: 0 } }, // tenants - nothing deleted
    ]);

    const result = await deleteVenue(db, "nonexistent");
    expect(result).toBe(false);
  });

  it("issues deletes in FK-safe order (floor_plans before tenants)", async () => {
    const db = mockDb();
    await deleteVenue(db, "tenant-1");

    const prepareCalls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    const sqls = prepareCalls.map((c) => c[0] as string);

    const floorPlansIdx = sqls.findIndex((s) => s.includes("floor_plans"));
    const tenantMembersIdx = sqls.findIndex((s) => s.includes("tenant_members"));
    const rolesIdx = sqls.findIndex((s) => s.includes("roles"));
    const venueThemesIdx = sqls.findIndex((s) => s.includes("venue_themes"));
    const tenantsIdx = sqls.findIndex((s) => s.includes("FROM tenants") || (s.includes("tenants") && !s.includes("tenant_members") && !s.includes("venue_themes")));

    expect(floorPlansIdx).toBeLessThan(tenantsIdx);
    expect(tenantMembersIdx).toBeLessThan(tenantsIdx);
    expect(rolesIdx).toBeLessThan(tenantsIdx);
    expect(venueThemesIdx).toBeLessThan(tenantsIdx);
  });
});
