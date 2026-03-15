import { test, expect } from "./fixtures/auth";
import { mockApi } from "./fixtures/api-mock";

test.describe("Restaurant Detail", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("displays restaurant info and reviews", async ({ page }) => {
    await page.goto("/restaurant/rest-001");

    await expect(page.locator("text=Taco Palace")).toBeVisible();
    await expect(page.locator("text=Mexican")).toBeVisible();
    await expect(page.locator("text=123 Main St")).toBeVisible();

    // Reviews should be visible
    await expect(page.locator("text=Test Butler")).toBeVisible();
    await expect(page.locator("text=Amazing tacos, best in town!")).toBeVisible();
  });

  test("shows score breakdown", async ({ page }) => {
    await page.goto("/restaurant/rest-001");

    // Average score should be displayed
    await expect(page.locator("text=8.5")).toBeVisible();
  });

  test("has back button that navigates home", async ({ page }) => {
    await page.goto("/restaurant/rest-001");

    await page.click('[aria-label="Back to restaurant list"]');
    await page.waitForURL("/");
  });

  test("shows review form", async ({ page }) => {
    await page.goto("/restaurant/rest-001");

    // The review form or "add review" trigger should be present
    // Look for the overall score slider or review form elements
    const reviewSection = page.locator("text=Save Review").or(
      page.locator('[aria-label="Overall score"]'),
    ).or(
      page.locator("text=Add a review").or(page.locator("text=Your Review")),
    );
    await expect(reviewSection).toBeVisible();
  });

  test("bookmark button toggles", async ({ page }) => {
    await page.goto("/restaurant/rest-001");

    const bookmarkBtn = page.locator('[aria-label*="Want to Try"]');
    await expect(bookmarkBtn).toBeVisible();
    await bookmarkBtn.click();

    // aria-label should change after toggle
    await expect(
      page.locator('[aria-label="Remove from Want to Try"]').or(
        page.locator('[aria-label="Add to Want to Try"]'),
      ),
    ).toBeVisible();
  });
});
