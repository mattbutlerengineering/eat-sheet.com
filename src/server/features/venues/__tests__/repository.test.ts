import { describe, it, expect, vi, beforeEach } from "vitest";
import { nanoid } from "nanoid";

vi.mock("nanoid", () => ({
  nanoid: vi.fn(),
}));

import { createVenueWithTheme } from "../repository";

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
