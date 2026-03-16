import { expect } from "@playwright/test";
import { testNotOnboarded as test } from "./fixtures/auth";
import { mockApi } from "./fixtures/api-mock";

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("shows step 1 on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Welcome to Eat Sheet!")).toBeVisible();
    await expect(page.locator("text=Tell me more")).toBeVisible();
    await expect(page.locator("text=Skip")).toBeVisible();
  });

  test("advances through all 3 steps", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Welcome to Eat Sheet!")).toBeVisible();

    await page.click("text=Tell me more");
    await expect(page.locator("text=Rate honestly")).toBeVisible();
    await expect(page.locator("text=Got it")).toBeVisible();

    await page.click("text=Got it");
    await expect(page.locator("text=Let's get started!")).toBeVisible();
    await expect(page.locator("text=Add a restaurant")).toBeVisible();
  });

  test("completing onboarding navigates to /add", async ({ page }) => {
    await page.goto("/");

    await page.click("text=Tell me more");
    await page.click("text=Got it");
    await page.click("text=Add a restaurant");

    await page.waitForURL("**/add");
    await expect(page.locator("h1", { hasText: "Add Restaurant" })).toBeVisible();
  });

  test("skip navigates to home", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Skip");

    // Skip sets onboarded and navigates to "/", which loads the restaurant list
    await expect(page.locator('[placeholder="Search restaurants..."]').or(page.locator("text=eat sheet"))).toBeVisible({ timeout: 10_000 });
  });
});
