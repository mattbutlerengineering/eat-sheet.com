import { test, expect } from "./fixtures/auth";
import { mockApi } from "./fixtures/api-mock";

test.describe("Discover Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("shows activity feed", async ({ page }) => {
    await page.goto("/discover");

    await expect(page.locator("text=Activity")).toBeVisible();
    // Activity items
    await expect(page.locator("text=Taco Palace")).toBeVisible();
    await expect(page.locator("text=Test Butler")).toBeVisible();
  });

  test("shows nearby tab", async ({ page }) => {
    await page.goto("/discover");

    await expect(page.locator("button:has-text('Nearby')")).toBeVisible();
  });
});

test.describe("Stats Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("displays total restaurants and reviews", async ({ page }) => {
    await page.goto("/stats");

    await expect(page.locator("text=3").first()).toBeVisible(); // total restaurants
    await expect(page.locator("text=5").first()).toBeVisible(); // total reviews
  });

  test("shows member leaderboard and cuisine breakdown", async ({ page }) => {
    await page.goto("/stats");

    // Member names (may appear in header + leaderboard, use .first())
    await expect(page.getByText("Test Butler").first()).toBeVisible();
    await expect(page.getByText("Jane Butler").first()).toBeVisible();

    // Cuisine breakdown
    await expect(page.locator("text=Mexican")).toBeVisible();
    await expect(page.locator("text=Japanese")).toBeVisible();
    await expect(page.locator("text=Italian")).toBeVisible();
  });
});
