import { test, expect } from "@playwright/test";
import { TEST_SHARED_RESTAURANT } from "./helpers/test-data";

// Share pages are public — no auth needed

test.describe("Share Page", () => {
  test("displays shared restaurant details", async ({ page }) => {
    await page.route("**/api/share/restaurant/valid-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: TEST_SHARED_RESTAURANT }),
      }),
    );

    await page.goto("/share/restaurant/valid-token");

    await expect(page.locator("h2", { hasText: "Taco Palace" })).toBeVisible();
    await expect(page.locator("text=Mexican")).toBeVisible();
    await expect(page.locator("text=123 Main St")).toBeVisible();
    await expect(page.locator("text=8.5")).toBeVisible();
    await expect(page.locator("text=Join Eat Sheet")).toBeVisible();
  });

  test("displays shared review details", async ({ page }) => {
    const sharedReview = {
      overall_score: 9,
      notes: "Amazing tacos, best in town!",
      photo_url: null,
      restaurant_name: "Taco Palace",
      restaurant_cuisine: "Mexican",
    };

    await page.route("**/api/share/review/review-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: sharedReview }),
      }),
    );

    await page.goto("/share/review/review-token");

    await expect(page.locator("h2", { hasText: "Taco Palace" })).toBeVisible();
    await expect(page.locator("text=9")).toBeVisible();
    await expect(page.locator("text=Amazing tacos, best in town!")).toBeVisible();
    await expect(page.locator("text=Join Eat Sheet")).toBeVisible();
  });

  test("shows error for invalid share token", async ({ page }) => {
    await page.route("**/api/share/restaurant/bad-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not found" }),
      }),
    );

    await page.goto("/share/restaurant/bad-token");

    await expect(
      page.locator("text=This share link is no longer available"),
    ).toBeVisible();
  });
});
