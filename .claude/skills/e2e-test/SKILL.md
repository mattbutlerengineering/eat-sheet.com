---
name: e2e-test
description: Scaffold a new Playwright E2E test with auth cookie injection and axe-core accessibility checks
disable-model-invocation: true
args: test-name
---

# Scaffold E2E Test

Create a new Playwright E2E test following eat-sheet conventions.

## Steps

1. Create `e2e/{test-name}.spec.ts` with this structure:

```typescript
import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test.describe("{Test Name}", () => {
  test("loads page", async ({ page }) => {
    await page.goto("/{route}");
    // Add assertions
  });

  test("accessibility", async ({ page }) => {
    await page.goto("/{route}");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(violations).toHaveLength(0);
  });
});
```

## Conventions

- Tests in `e2e/` directory
- Auth via JWT cookie injection (see `e2e/helpers/auth.ts` for `TEST_USER`, `JWT_SECRET`)
- Global setup in `e2e/global-setup.ts` seeds test user via `wrangler d1 execute --local`
- Use `e2e/fixtures/index.ts` for shared page fixtures with auth state
- axe-core tests fail on critical/serious WCAG 2.1 AA violations
- Playwright + Konva: use `force: true` on canvas clicks
- Run with: `pnpm test:e2e`
