import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("@server/features/venues/color-extraction", () => ({
  extractDominantColors: vi.fn(async () => ["#ff0000", "#00ff00"]),
}));

vi.mock("@server/features/venues/service", () => ({
  generateSlug: vi.fn(async () => "verde-kitchen"),
}));

vi.mock("@server/features/venues/repository", () => ({
  createVenueWithTheme: vi.fn(async () => {}),
}));

vi.mock("@server/features/auth/service", () => ({
  buildJwtPayload: vi.fn(async () => ({
    sub: "user-1",
    email: "test@test.com",
    name: "Test",
    tenantId: "t-1",
    roleId: "role_owner",
    permissions: ["*"],
    exp: Math.floor(Date.now() / 1000) + 3600,
  })),
  signJwt: vi.fn(async () => "signed-jwt-token"),
}));

vi.mock("@server/features/auth/repository", () => ({
  findUserByEmail: vi.fn(async () => ({
    id: "user-1",
    email: "test@test.com",
    name: "Test",
    avatar_url: null,
  })),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-nanoid"),
}));

vi.mock("@server/features/floor-plans/repository", () => ({
  createFloorPlan: vi.fn(async () => ({
    id: "fp-1",
    tenant_id: "t-1",
    name: "Floor 1",
    sort_order: 1,
    canvas_width: 1200,
    canvas_height: 800,
    layout_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  saveFloorPlan: vi.fn(async () => {}),
}));

import { handleLogoUpload, completeOnboarding } from "../service";
import { createVenueWithTheme } from "@server/features/venues/repository";
import { generateSlug } from "@server/features/venues/service";
import { findUserByEmail } from "@server/features/auth/repository";
import { createFloorPlan, saveFloorPlan } from "@server/features/floor-plans/repository";

function mockR2(): R2Bucket {
  return {
    put: vi.fn(async () => null),
    get: vi.fn(async () => null),
    delete: vi.fn(async () => {}),
    list: vi.fn(async () => ({ objects: [], truncated: false })),
    head: vi.fn(async () => null),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  } as unknown as R2Bucket;
}

function mockDb(ownerRoleId: string | null = "role_owner") {
  const stmt = {
    bind: vi.fn(() => stmt),
    first: vi.fn()
      .mockResolvedValueOnce(ownerRoleId ? { id: ownerRoleId } : null)
      .mockResolvedValue({ id: "t-1" }),
    run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
    all: vi.fn(async () => ({
      results: [
        {
          tenant_id: "t-1",
          role_id: "role_owner",
          permissions: '["*"]',
        },
      ],
    })),
  };

  return {
    prepare: vi.fn(() => stmt),
    batch: vi.fn(async () => []),
  } as unknown as D1Database;
}

describe("handleLogoUpload", () => {
  it("stores file in R2 and returns logo URL + extracted colors", async () => {
    const r2 = mockR2();
    const file = new File([new Uint8Array([1, 2, 3])], "logo.png", {
      type: "image/png",
    });

    const result = await handleLogoUpload(r2, file, "user-1");

    expect(r2.put).toHaveBeenCalledOnce();
    expect(result.logoUrl).toContain("/api/onboarding/logos/");
    expect(result.logoUrl).toContain("user-1");
    expect(result.extractedColors).toEqual(["#ff0000", "#00ff00"]);
  });

  it("uses correct file extension", async () => {
    const r2 = mockR2();
    const file = new File([new Uint8Array([1])], "brand.svg", {
      type: "image/svg+xml",
    });

    const result = await handleLogoUpload(r2, file, "user-1");

    // The R2 key should end with .svg
    const putCall = (r2.put as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(putCall[0]).toMatch(/\.svg$/);
    expect(result.logoUrl).toBeDefined();
  });
});

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    venueInfo: {
      name: "Verde Kitchen",
      type: "casual" as const,
      cuisines: ["Italian", "Mediterranean"],
    },
    location: {
      addressLine1: "123 Main St",
      addressLine2: "",
      city: "San Francisco",
      state: "CA",
      zip: "94102",
      country: "US",
      timezone: "America/Los_Angeles",
      phone: "",
      website: "",
    },
    brand: {
      accent: "#2d4a2d",
      accentHover: "#1a3a1a",
      surface: null,
      surfaceElevated: null,
      textPrimary: null,
      source: "extracted" as const,
    },
    logoUrl: "/api/onboarding/logos/user-1/test.png",
  };

  it("creates venue with all location, logo, and brand data", async () => {
    const db = mockDb();

    const jwt = await completeOnboarding(
      db,
      "user-1",
      "test@test.com",
      validInput,
      "secret",
    );

    expect(generateSlug).toHaveBeenCalledWith(db, "Verde Kitchen");
    expect(createVenueWithTheme).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        name: "Verde Kitchen",
        slug: "verde-kitchen",
        addressLine1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94102",
        phone: "",
        website: "",
        logoUrl: "/api/onboarding/logos/user-1/test.png",
        accent: "#2d4a2d",
        accentHover: "#1a3a1a",
        source: "extracted",
        userId: "user-1",
        ownerRoleId: "role_owner",
      }),
    );
    expect(findUserByEmail).toHaveBeenCalledWith(db, "test@test.com");
    expect(jwt).toBe("signed-jwt-token");
  });

  it("throws if Owner role not found", async () => {
    const db = mockDb(null as unknown as string);

    await expect(
      completeOnboarding(db, "user-1", "test@test.com", validInput, "secret"),
    ).rejects.toThrow("Owner role not found");
  });

  it("creates floor plan when floorPlan is provided", async () => {
    const db = mockDb();
    const inputWithFloorPlan = {
      ...validInput,
      floorPlan: {
        templateId: "fine-dining",
        size: "standard",
        tableCount: 16,
        seatCount: 64,
      },
    };

    await completeOnboarding(
      db,
      "user-1",
      "test@test.com",
      inputWithFloorPlan,
      "secret",
    );

    expect(createFloorPlan).toHaveBeenCalledWith(db, expect.any(String), "Floor 1");
    expect(saveFloorPlan).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        planId: "fp-1",
        canvasWidth: 1200,
        canvasHeight: 800,
      }),
    );
  });

  it("does not create floor plan when floorPlan is absent", async () => {
    const db = mockDb();

    await completeOnboarding(
      db,
      "user-1",
      "test@test.com",
      validInput,
      "secret",
    );

    expect(createFloorPlan).not.toHaveBeenCalled();
    expect(saveFloorPlan).not.toHaveBeenCalled();
  });
});
