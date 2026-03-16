import { describe, it, expect } from "vitest";
import { scoreBadgeColor, scoreDisplay } from "../score";

describe("scoreBadgeColor", () => {
  it("returns neutral for null", () => {
    expect(scoreBadgeColor(null)).toContain("stone");
  });

  it("returns red for scores 1-3", () => {
    expect(scoreBadgeColor(1)).toContain("red");
    expect(scoreBadgeColor(3)).toContain("red");
  });

  it("returns amber for scores 4-7", () => {
    expect(scoreBadgeColor(4)).toContain("amber");
    expect(scoreBadgeColor(5)).toContain("amber");
    expect(scoreBadgeColor(7)).toContain("amber");
  });

  it("returns green for scores 8-10", () => {
    expect(scoreBadgeColor(8)).toContain("green");
    expect(scoreBadgeColor(10)).toContain("green");
  });
});

describe("scoreDisplay", () => {
  it("returns dash for null", () => {
    expect(scoreDisplay(null)).toBe("—");
  });

  it("formats number with one decimal", () => {
    expect(scoreDisplay(7)).toBe("7.0");
    expect(scoreDisplay(8.5)).toBe("8.5");
    expect(scoreDisplay(9.25)).toBe("9.3");
  });
});
