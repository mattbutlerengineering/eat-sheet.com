import { describe, it, expect } from "vitest";
import { cuisineEmoji, cuisineLabel, CUISINES } from "../cuisines";

describe("cuisineEmoji", () => {
  it("returns default emoji for null/undefined", () => {
    expect(cuisineEmoji(null)).toBeTruthy();
    expect(cuisineEmoji(undefined)).toBeTruthy();
  });

  it("returns specific emoji for known cuisines", () => {
    expect(cuisineEmoji("Italian")).toBe("\u{1F35D}");
    expect(cuisineEmoji("Japanese")).toBe("\u{1F363}");
    expect(cuisineEmoji("Mexican")).toBe("\u{1F32E}");
  });

  it("returns fallback for unknown cuisine", () => {
    expect(cuisineEmoji("Martian")).toBe("\u{1F37D}\uFE0F");
  });
});

describe("cuisineLabel", () => {
  it("returns empty string for null/undefined", () => {
    expect(cuisineLabel(null)).toBe("");
    expect(cuisineLabel(undefined)).toBe("");
  });

  it("returns emoji + name for known cuisine", () => {
    const label = cuisineLabel("Italian");
    expect(label).toContain("Italian");
    expect(label).toContain("\u{1F35D}");
  });
});

describe("CUISINES", () => {
  it("has at least 20 entries", () => {
    expect(CUISINES.length).toBeGreaterThanOrEqual(20);
  });

  it("is alphabetically sorted except Other at the end", () => {
    const allButLast = CUISINES.slice(0, -1);
    const sorted = [...allButLast].sort();
    expect(allButLast).toEqual(sorted);
    expect(CUISINES[CUISINES.length - 1]).toBe("Other");
  });
});
