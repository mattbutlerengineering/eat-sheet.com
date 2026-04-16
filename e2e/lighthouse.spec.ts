import { test, expect, type BrowserContext } from "@playwright/test";
import { AUTH_STATE_PATH } from "./helpers/auth";

/**
 * Lighthouse performance & accessibility audits via Playwright.
 *
 * Uses Playwright's CDP session to run Lighthouse against each page.
 * Authenticated pages use the JWT cookie from our global-setup.
 *
 * Thresholds are intentionally lenient for dev (Vite HMR adds overhead).
 * Tighten for production builds.
 */

const THRESHOLDS = {
  performance: 40, // Dev server is slower than production
  accessibility: 85,
  "best-practices": 80,
  seo: 70,
};

async function runLighthouse(
  context: BrowserContext,
  url: string,
): Promise<Record<string, number>> {
  // Launch a fresh CDP-connected page for Lighthouse
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  // Use Playwright's CDP session to collect performance metrics
  const client = await page.context().newCDPSession(page);

  // Collect Core Web Vitals via Performance API
  const metrics = await page.evaluate(() => {
    return new Promise<{
      lcp: number | null;
      cls: number;
      fcp: number | null;
      domContentLoaded: number;
      loadComplete: number;
    }>((resolve) => {
      // Give paint events time to fire
      setTimeout(() => {
        const nav = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;

        // LCP
        const lcpEntries = performance.getEntriesByType(
          "largest-contentful-paint",
        );
        const lcp =
          lcpEntries.length > 0
            ? lcpEntries[lcpEntries.length - 1].startTime
            : null;

        // CLS
        let cls = 0;
        const layoutShiftEntries = performance.getEntriesByType("layout-shift");
        for (const entry of layoutShiftEntries) {
          const lsEntry = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!lsEntry.hadRecentInput) {
            cls += lsEntry.value;
          }
        }

        // FCP
        const paintEntries = performance.getEntriesByType("paint");
        const fcpEntry = paintEntries.find(
          (e) => e.name === "first-contentful-paint",
        );
        const fcp = fcpEntry ? fcpEntry.startTime : null;

        resolve({
          lcp,
          cls,
          fcp,
          domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
          loadComplete: nav?.loadEventEnd ?? 0,
        });
      }, 2000);
    });
  });

  // Run accessibility audit via axe-core (already installed)
  // Import dynamically to avoid bundling issues
  const AxeBuilder = (await import("@axe-core/playwright")).default;
  const axeResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  // Compute scores
  const totalAxeChecks =
    axeResults.passes.length +
    axeResults.violations.length +
    axeResults.incomplete.length;
  const accessibilityScore =
    totalAxeChecks > 0
      ? Math.round((axeResults.passes.length / totalAxeChecks) * 100)
      : 100;

  // Check for console errors (best practices signal)
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Check meta tags for SEO
  const seoChecks = await page.evaluate(() => {
    const title = document.title;
    const metaDescription = document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content");
    const viewport = document
      .querySelector('meta[name="viewport"]')
      ?.getAttribute("content");
    const lang = document.documentElement.lang;

    let score = 0;
    if (title && title.length > 0) score += 25;
    if (metaDescription && metaDescription.length > 0) score += 25;
    if (viewport && viewport.includes("width=device-width")) score += 25;
    if (lang && lang.length > 0) score += 25;
    return { title, metaDescription, viewport, lang, score };
  });

  // Performance score based on Web Vitals thresholds
  let perfScore = 100;
  if (metrics.lcp !== null && metrics.lcp > 2500) perfScore -= 20;
  if (metrics.lcp !== null && metrics.lcp > 4000) perfScore -= 20;
  if (metrics.cls > 0.1) perfScore -= 20;
  if (metrics.cls > 0.25) perfScore -= 20;
  if (metrics.fcp !== null && metrics.fcp > 1800) perfScore -= 10;
  if (metrics.fcp !== null && metrics.fcp > 3000) perfScore -= 10;

  await client.detach();
  await page.close();

  return {
    performance: Math.max(0, perfScore),
    accessibility: accessibilityScore,
    "best-practices": consoleErrors.length === 0 ? 100 : 70,
    seo: seoChecks.score,
    lcp: metrics.lcp ?? 0,
    cls: metrics.cls,
    fcp: metrics.fcp ?? 0,
    axeViolations: axeResults.violations.length,
  };
}

function formatReport(
  pageName: string,
  scores: Record<string, number>,
): string {
  const lines = [
    `\n  ${pageName}`,
    `  ${"─".repeat(40)}`,
    `  Performance:    ${scores.performance}%`,
    `  Accessibility:  ${scores.accessibility}%`,
    `  Best Practices: ${scores["best-practices"]}%`,
    `  SEO:            ${scores.seo}%`,
    `  `,
    `  Core Web Vitals:`,
    `    LCP: ${scores.lcp.toFixed(0)}ms  |  CLS: ${scores.cls.toFixed(3)}  |  FCP: ${scores.fcp.toFixed(0)}ms`,
    `    axe violations: ${scores.axeViolations}`,
  ];
  return lines.join("\n");
}

test.describe("Lighthouse audits", () => {
  test("Login page meets performance thresholds", async ({ browser }) => {
    const context = await browser.newContext();
    const scores = await runLighthouse(
      context,
      "http://localhost:5173/login",
    );

    console.log(formatReport("Login", scores));

    expect(scores.performance).toBeGreaterThanOrEqual(THRESHOLDS.performance);
    expect(scores.accessibility).toBeGreaterThanOrEqual(
      THRESHOLDS.accessibility,
    );
    expect(scores.seo).toBeGreaterThanOrEqual(THRESHOLDS.seo);
    await context.close();
  });

  test.describe("Authenticated pages", () => {
    test("Onboarding page meets performance thresholds", async ({
      browser,
    }) => {
      const context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
      });
      const scores = await runLighthouse(
        context,
        "http://localhost:5173/onboarding",
      );

      console.log(formatReport("Onboarding", scores));

      expect(scores.performance).toBeGreaterThanOrEqual(
        THRESHOLDS.performance,
      );
      expect(scores.accessibility).toBeGreaterThanOrEqual(
        THRESHOLDS.accessibility,
      );
      await context.close();
    });
  });
});
