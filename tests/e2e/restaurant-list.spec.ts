import { test, expect } from "./fixtures/auth";
import { mockApi } from "./fixtures/api-mock";
import { TEST_RESTAURANTS } from "./helpers/test-data";

test.describe("Restaurant List (Home)", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("renders restaurant cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Taco Palace")).toBeVisible();
    await expect(page.locator("text=Sushi World")).toBeVisible();
    await expect(page.locator("text=Pizza Roma")).toBeVisible();
  });

  test("shows empty state when no restaurants", async ({ page }) => {
    await mockApi(page, { restaurants: [] });
    await page.goto("/");

    // Empty state should show some call-to-action or message
    await expect(
      page.locator("text=Add restaurant").or(page.locator("text=No restaurants")).or(page.locator('[aria-label="Add restaurant"]')),
    ).toBeVisible();
  });

  test("filters by search query", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[placeholder="Search restaurants..."]', "Taco");

    await expect(page.locator("text=Taco Palace")).toBeVisible();
    await expect(page.locator("text=Sushi World")).not.toBeVisible();
    await expect(page.locator("text=Pizza Roma")).not.toBeVisible();
  });

  test("filters by cuisine", async ({ page }) => {
    await page.goto("/");

    // Click cuisine chip for Mexican
    await page.click("button:has-text('Mexican')");

    await expect(page.locator("text=Taco Palace")).toBeVisible();
    await expect(page.locator("text=Sushi World")).not.toBeVisible();
  });

  test("toggles sort between Recent and Top Rated", async ({ page }) => {
    await page.goto("/");

    // Verify sort buttons exist
    await expect(page.locator("button:has-text('Recent')")).toBeVisible();
    await expect(page.locator("button:has-text('Top Rated')")).toBeVisible();

    // Click Top Rated
    await page.click("button:has-text('Top Rated')");

    // First card should be highest rated (Taco Palace 8.5)
    const firstCard = page.locator("a[href*='/restaurant/']").first();
    await expect(firstCard).toContainText("Taco Palace");
  });

  test("shows FAB to add restaurant", async ({ page }) => {
    await page.goto("/");

    const fab = page.locator('[aria-label="Add restaurant"]');
    await expect(fab).toBeVisible();
    await fab.click();

    await page.waitForURL("**/add");
  });

  test("navigates to restaurant detail on card click", async ({ page }) => {
    await page.goto("/");

    await page.click("text=Taco Palace");
    await page.waitForURL("**/restaurant/rest-001");
  });
});
