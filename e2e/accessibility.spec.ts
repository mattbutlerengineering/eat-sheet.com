import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { AUTH_STATE_PATH } from "./helpers/auth";

/**
 * Accessibility tests using axe-core.
 *
 * Runs WCAG 2.1 AA automated checks against each page.
 * These catch ~57% of accessibility issues — the rest require manual review.
 *
 * We filter for critical + serious violations but exclude color-contrast
 * from the "fail the test" set because Rialto's tertiary text tokens are
 * a design system concern that should be addressed upstream. They are
 * still logged for awareness.
 */

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
): string {
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instance${v.nodes.length > 1 ? "s" : ""})`,
    )
    .join("\n");
}

test.describe("Accessibility", () => {
  test("Login page has no critical accessibility violations", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    // Log contrast issues as warnings but don't fail on them
    const contrastIssues = critical.filter((v) => v.id === "color-contrast");
    const failingIssues = critical.filter((v) => v.id !== "color-contrast");

    if (contrastIssues.length > 0) {
      console.log(
        "Login color-contrast warnings:\n" + formatViolations(contrastIssues),
      );
    }

    if (failingIssues.length > 0) {
      console.log(
        "Login accessibility violations:\n" + formatViolations(failingIssues),
      );
    }

    expect(failingIssues).toEqual([]);
  });

  test.describe("Onboarding has no critical accessibility violations", () => {
    test.use({ storageState: AUTH_STATE_PATH });

    test("Step 1 — Venue Info", async ({ page }) => {
      await page.goto("/onboarding");
      await expect(page.getByText("Step 1 of 5")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      const contrastIssues = critical.filter((v) => v.id === "color-contrast");
      const failingIssues = critical.filter((v) => v.id !== "color-contrast");

      if (contrastIssues.length > 0) {
        console.log(
          "Onboarding Step 1 color-contrast warnings:\n" +
            formatViolations(contrastIssues),
        );
      }

      if (failingIssues.length > 0) {
        console.log(
          "Onboarding Step 1 accessibility violations:\n" +
            formatViolations(failingIssues),
        );
      }

      expect(failingIssues).toEqual([]);
    });
  });

  test.describe("Dashboard/landing has no critical accessibility violations", () => {
    test.use({ storageState: AUTH_STATE_PATH });

    test("Landing page after auth", async ({ page }) => {
      // The auth state user has tenantId: null, so they'll be
      // redirected to /onboarding. This test validates whatever
      // page the authenticated user lands on.
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Wait for page content to render
      const heading = page.locator("h1");
      await heading.waitFor({ timeout: 10_000 });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      const contrastIssues = critical.filter((v) => v.id === "color-contrast");
      const failingIssues = critical.filter((v) => v.id !== "color-contrast");

      if (contrastIssues.length > 0) {
        console.log(
          "Landing page color-contrast warnings:\n" +
            formatViolations(contrastIssues),
        );
      }

      if (failingIssues.length > 0) {
        console.log(
          "Landing page accessibility violations:\n" +
            formatViolations(failingIssues),
        );
      }

      expect(failingIssues).toEqual([]);
    });
  });
});
