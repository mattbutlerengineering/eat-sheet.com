import { test as base } from "@playwright/test";
import { TEST_AUTH } from "../helpers/test-data";

export const test = base.extend<{ authenticatedPage: void }>({
  authenticatedPage: [
    async ({ page }, use) => {
      await page.addInitScript((auth) => {
        localStorage.setItem("eat-sheet-auth", JSON.stringify(auth));
        localStorage.setItem("eat-sheet-onboarded", "true");
      }, TEST_AUTH);
      await use();
    },
    { auto: true },
  ],
});

export const testNotOnboarded = base.extend<{ authedNotOnboarded: void }>({
  authedNotOnboarded: [
    async ({ page }, use) => {
      await page.addInitScript((auth) => {
        localStorage.setItem("eat-sheet-auth", JSON.stringify(auth));
      }, TEST_AUTH);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
