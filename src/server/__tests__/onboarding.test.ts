import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../..");

describe("OnboardingFlow component", () => {
  const src = readFileSync(resolve(ROOT, "src/client/components/OnboardingFlow.tsx"), "utf-8");

  it("exports OnboardingFlow and isOnboarded", () => {
    expect(src).toContain("export function OnboardingFlow");
    expect(src).toContain("export function isOnboarded");
  });

  it("has 3 onboarding steps", () => {
    expect(src).toContain("Welcome to Eat Sheet");
    expect(src).toContain("Rate honestly");
    expect(src).toContain("Let's get started");
  });

  it("has skip button on every step", () => {
    expect(src).toContain("Skip");
  });

  it("sets localStorage flag on completion", () => {
    expect(src).toContain("eat-sheet-onboarded");
    expect(src).toContain('localStorage.setItem(ONBOARDING_KEY, "true")');
  });

  it("navigates to /add on completion", () => {
    expect(src).toContain('navigate("/add")');
  });

  it("navigates to / on skip", () => {
    expect(src).toContain('navigate("/")');
  });

  it("is integrated into App.tsx", () => {
    const app = readFileSync(resolve(ROOT, "src/client/App.tsx"), "utf-8");
    expect(app).toContain("OnboardingFlow");
    expect(app).toContain("isOnboarded");
    expect(app).toContain("/onboarding");
  });
});

describe("Empty states", () => {
  it("RestaurantList has actionable CTA button", () => {
    const src = readFileSync(resolve(ROOT, "src/client/components/RestaurantList.tsx"), "utf-8");
    expect(src).toContain("Add Your First Restaurant");
  });

  it("ActivityFeed explains what will appear", () => {
    const src = readFileSync(resolve(ROOT, "src/client/components/ActivityFeed.tsx"), "utf-8");
    expect(src).toContain("adds restaurants and leaves reviews");
  });

  it("FamilyStats has empty state with preview", () => {
    const src = readFileSync(resolve(ROOT, "src/client/components/FamilyStats.tsx"), "utf-8");
    expect(src).toContain("No stats yet");
    expect(src).toContain("leaderboards, cuisine breakdowns");
  });
});
