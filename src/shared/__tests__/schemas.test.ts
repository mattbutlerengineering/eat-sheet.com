import { describe, it, expect } from "vitest";
import {
  venueInfoSchema,
  venueLocationSchema,
  venueBrandSchema,
} from "../schemas/venue";

describe("venueInfoSchema", () => {
  it("accepts a valid venue info object", () => {
    const result = venueInfoSchema.safeParse({
      name: "The Grand Bistro",
      type: "fine_dining",
      cuisines: ["French", "Italian"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = venueInfoSchema.safeParse({
      name: "",
      type: "casual",
      cuisines: ["American"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) =>
        i.path.includes("name"),
      );
      expect(nameError).toBeDefined();
    }
  });

  it("rejects an empty cuisines array", () => {
    const result = venueInfoSchema.safeParse({
      name: "Sushi Place",
      type: "casual",
      cuisines: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cuisinesError = result.error.issues.find((i) =>
        i.path.includes("cuisines"),
      );
      expect(cuisinesError).toBeDefined();
    }
  });

  it("rejects an invalid venue type", () => {
    const result = venueInfoSchema.safeParse({
      name: "Some Place",
      type: "nightclub",
      cuisines: ["American"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const typeError = result.error.issues.find((i) =>
        i.path.includes("type"),
      );
      expect(typeError).toBeDefined();
    }
  });
});

describe("venueLocationSchema", () => {
  it("accepts a valid location with timezone", () => {
    const result = venueLocationSchema.safeParse({
      timezone: "America/New_York",
      country: "US",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe("America/New_York");
    }
  });

  it("rejects a missing timezone", () => {
    const result = venueLocationSchema.safeParse({
      country: "US",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const tzError = result.error.issues.find((i) =>
        i.path.includes("timezone"),
      );
      expect(tzError).toBeDefined();
    }
  });

  it("accepts any string for website", () => {
    const result = venueLocationSchema.safeParse({
      timezone: "America/Chicago",
      website: "myrestaurant.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty string for website", () => {
    const result = venueLocationSchema.safeParse({
      timezone: "America/Los_Angeles",
      website: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe("");
    }
  });
});

describe("venueBrandSchema", () => {
  it("accepts valid hex colors", () => {
    const result = venueBrandSchema.safeParse({
      accent: "#FF5733",
      accentHover: "#C70039",
      source: "manual",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-hex accent color", () => {
    const result = venueBrandSchema.safeParse({
      accent: "red",
      accentHover: "#C70039",
      source: "manual",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const accentError = result.error.issues.find((i) =>
        i.path.includes("accent"),
      );
      expect(accentError).toBeDefined();
    }
  });

  it("rejects a non-hex accentHover color", () => {
    const result = venueBrandSchema.safeParse({
      accent: "#FF5733",
      accentHover: "rgb(100,200,50)",
      source: "manual",
    });
    expect(result.success).toBe(false);
  });

  it("defaults nullable fields to null", () => {
    const result = venueBrandSchema.safeParse({
      accent: "#AABBCC",
      accentHover: "#112233",
      source: "extracted",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.surface).toBeNull();
      expect(result.data.surfaceElevated).toBeNull();
      expect(result.data.textPrimary).toBeNull();
    }
  });
});
