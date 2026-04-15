import { describe, it, expect, vi } from "vitest";

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

import { handleLogoUpload, completeOnboarding } from "../service";
import { createVenueWithTheme } from "@server/features/venues/repository";
import { generateSlug } from "@server/features/venues/service";
import { findUserByEmail } from "@server/features/auth/repository";

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
    first: vi.fn(async () =>
      ownerRoleId ? { id: ownerRoleId } : null,
    ),
    run: vi.fn(async () => ({ success: true })),
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
    const putCall = (r2.put as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(putCall[0]).toMatch(/\.svg$/);
    expect(result.logoUrl).toBeDefined();
  });
});

describe("completeOnboarding", () => {
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

  it("creates venue, returns signed JWT", async () => {
    const db = mockDb();

    const jwt = await completeOnboarding(
      db,
      "user-1",
      "test@test.com",
      validInput,
      "secret",
    );

    expect(generateSlug).toHaveBeenCalledWith(db, "Verde Kitchen");
    expect(createVenueWithTheme).toHaveBeenCalledOnce();
    expect(findUserByEmail).toHaveBeenCalledWith(db, "test@test.com");
    expect(jwt).toBe("signed-jwt-token");
  });

  it("throws if Owner role not found", async () => {
    const db = mockDb(null as unknown as string);

    await expect(
      completeOnboarding(db, "user-1", "test@test.com", validInput, "secret"),
    ).rejects.toThrow("Owner role not found");
  });
});
