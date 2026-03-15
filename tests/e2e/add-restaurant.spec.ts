import { test, expect } from "./fixtures/auth";
import { mockApi } from "./fixtures/api-mock";

test.describe("Add Restaurant", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("renders add restaurant form", async ({ page }) => {
    await page.goto("/add");

    await expect(page.locator("h1", { hasText: "Add Restaurant" })).toBeVisible();
    await expect(page.locator('[aria-label="Restaurant name"]')).toBeVisible();
    await expect(page.locator("#r-cuisine")).toBeVisible();
  });

  test("submit button is disabled without name", async ({ page }) => {
    await page.goto("/add");

    const submitBtn = page.locator("button:has-text('Add Restaurant')");
    await expect(submitBtn).toBeDisabled();
  });

  test("can fill and submit the form", async ({ page }) => {
    await page.goto("/add");

    // Type a restaurant name
    await page.fill('[aria-label="Restaurant name"]', "New Test Restaurant");

    // Select a cuisine
    await page.selectOption("#r-cuisine", "Italian");

    // Submit button should be enabled
    const submitBtn = page.locator("button:has-text('Add Restaurant')");
    await expect(submitBtn).toBeEnabled();

    await submitBtn.click();

    // Should navigate away after successful creation
    await page.waitForURL("**/restaurant/**");
  });

  test("back button returns to previous page", async ({ page }) => {
    await page.goto("/");
    await page.goto("/add");

    await page.click('[aria-label="Go back"]');
    await page.waitForURL("/");
  });
});
