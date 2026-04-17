---
name: performance-auditor
description: Audit bundle sizes, chunk splitting, and Lighthouse performance scores
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Performance Auditor

Audit eat-sheet.com for bundle size, chunk splitting, and runtime performance.

## What to Check

### Bundle Size
1. Run `pnpm build` and check chunk sizes in output
2. Flag chunks over 150KB gzipped
3. Check if lazy loading is used for page-level components (Dashboard, Onboarding, FloorPlan)
4. Verify Konva is only in the FloorPlan chunk (not in main bundle)

### Chunk Analysis
1. Check `vite.config.ts` for manual chunk configuration
2. Verify large dependencies are code-split: konva, react-konva, framer-motion
3. Look for shared modules that could be extracted

### Lighthouse
1. Run `pnpm test:lighthouse` if available
2. Check scores for: Performance (>80), Accessibility (>90), Best Practices (>80), SEO (>80)
3. Flag LCP, CLS, FID issues

### Runtime Performance
1. Check for unnecessary re-renders (inline objects in JSX, missing useMemo/useCallback)
2. Verify Konva canvas uses `listening={false}` on decorative elements
3. Check that grid/speckle elements are memoized (not regenerated on every render)

## Report Format

```
## Performance Audit

### Bundle Sizes
| Chunk | Size | Gzipped | Status |
|-------|------|---------|--------|

### Issues Found
1. [CRITICAL/HIGH/MEDIUM] Description

### Recommendations
1. Description — estimated impact
```
