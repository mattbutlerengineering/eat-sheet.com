import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTH_STATE_PATH } from "./helpers/auth";
import { selectRialtoOption, selectRialtoCuisine } from "./helpers/rialto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.use({ storageState: AUTH_STATE_PATH });

test.describe("Onboarding flow", () => {
  test("completes full onboarding with logo upload", async ({ page }) => {
    // Navigate to root — should redirect to /onboarding (user has no tenantId)
    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding/);

    // ─── STEP 1: Venue Info ───────────────────────────────────────────
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
    await expect(page.locator("h1")).toHaveText("What's your venue called?");

    // Fill venue name (Rialto Input renders <label> + <input>)
    await page.getByLabel("Venue name").fill("Verde Kitchen");

    // Select venue type (Rialto custom Select with aria-label)
    await selectRialtoOption(page, "Venue type", "Casual Dining");

    // Add cuisines (each is a separate open→pick→close cycle)
    await selectRialtoCuisine(page, "Italian");
    await selectRialtoCuisine(page, "Mediterranean");

    // Verify tags appeared (exact match avoids hitting the preview "Italian · Mediterranean")
    await expect(page.getByText("Italian", { exact: true })).toBeVisible();
    await expect(page.getByText("Mediterranean", { exact: true })).toBeVisible();

    // Continue should be enabled now
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // ─── STEP 2: Location ─────────────────────────────────────────────
    await expect(page.getByText("Step 2 of 5")).toBeVisible();
    await expect(page.locator("h1")).toHaveText("Where are you located?");

    // Timezone auto-populates on mount, so Continue should be enabled
    // Fill optional address fields for a more complete test
    await page.getByLabel("Street address").fill("123 Main St");
    await page.getByLabel("City").fill("San Francisco");
    await page.getByLabel("State").fill("CA");
    await page.getByLabel("ZIP").fill("94102");

    await page.getByRole("button", { name: "Continue" }).click();

    // ─── STEP 3: Logo Upload ──────────────────────────────────────────
    await expect(page.getByText("Step 3 of 5")).toBeVisible();
    await expect(page.locator("h1")).toHaveText("Add your logo");

    // Upload the test fixture PNG (hidden input, Playwright handles it)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "logo.png"));

    // Wait for upload to complete — logo preview image appears
    await expect(
      page.locator('img[alt="Your logo"]'),
    ).toBeVisible({ timeout: 15_000 });

    // Button should say "Continue" (not "Skip") after upload
    await page.getByRole("button", { name: "Continue" }).click();

    // ─── STEP 4: Brand ────────────────────────────────────────────────
    await expect(page.getByText("Step 4 of 5")).toBeVisible();
    await expect(page.locator("h1")).toHaveText("Your brand");

    // Brand auto-initializes on mount — color picker should be visible
    await expect(page.locator('input[type="color"]')).toBeVisible();

    // Continue should be enabled (brand data set on mount)
    await page.getByRole("button", { name: "Continue" }).click();

    // ─── STEP 5: Welcome ──────────────────────────────────────────────
    await expect(page.getByText("Step 5 of 5")).toBeVisible();

    // Verify venue name in the preview
    await expect(page.getByText("Verde Kitchen").first()).toBeVisible();

    // Click the "Enter Verde Kitchen →" button
    const enterBtn = page.getByRole("button", {
      name: /Enter Verde Kitchen/,
    });
    await expect(enterBtn).toBeVisible();
    await enterBtn.click();

    // Server creates venue + theme + membership, issues new JWT
    // Client navigates to "/" which now renders Dashboard
    await expect(page).toHaveURL("/", { timeout: 15_000 });
  });

  test("completes onboarding skipping logo upload", async ({ page }) => {
    // Navigate directly to /onboarding
    await page.goto("/onboarding");
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // Step 1: Venue Info
    await page.getByLabel("Venue name").fill("Skipped Logo Cafe");
    await selectRialtoOption(page, "Venue type", "Café");
    await selectRialtoCuisine(page, "American");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Location — timezone auto-populated, just continue
    await expect(page.getByText("Step 2 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Logo — click Skip (no upload)
    await expect(page.getByText("Step 3 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Step 4: Brand — auto-initializes, continue
    await expect(page.getByText("Step 4 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5: Welcome — enter
    await expect(page.getByText("Step 5 of 5")).toBeVisible();
    await page
      .getByRole("button", { name: /Enter Skipped Logo Cafe/ })
      .click();

    await expect(page).toHaveURL("/", { timeout: 15_000 });
  });

  test("back button navigates to previous step and preserves data", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    // Fill step 1 and advance
    await page.getByLabel("Venue name").fill("Back Test Bistro");
    await selectRialtoOption(page, "Venue type", "Bar & Lounge");
    await selectRialtoCuisine(page, "Japanese");
    await page.getByRole("button", { name: "Continue" }).click();

    // On step 2 — click Back
    await expect(page.getByText("Step 2 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();

    // Should be back on step 1 with data preserved
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
    await expect(page.getByLabel("Venue name")).toHaveValue("Back Test Bistro");
  });

  test("continue button is disabled when required fields are empty", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // Continue should be disabled with no data
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeDisabled();

    // Fill only name — still disabled (need type + cuisine)
    await page.getByLabel("Venue name").fill("Incomplete Venue");
    await expect(continueBtn).toBeDisabled();
  });
});
