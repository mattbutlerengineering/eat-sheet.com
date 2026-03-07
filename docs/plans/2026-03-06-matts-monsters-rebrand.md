# Matt's Monsters Visual Rebrand — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Slurms SVG mascot with Matt's Monster PNGs, rename to "Chomps", swap color palette from orange to coral/teal, add PWA manifest.

**Architecture:** Drop-in component replacement (Monster.tsx replaces Slurms.tsx), CSS variable additions for new palette, mechanical find-and-replace across 18+ consumer files. PWA icons generated from teal-big.png source asset.

**Tech Stack:** React, Tailwind v4 (@theme), Vite, PNG assets

---

### Task 1: Create Monster component

**Files:**
- Create: `src/client/components/Monster.tsx`
- Test: `src/client/__tests__/Monster.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/client/__tests__/Monster.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Monster } from "../components/Monster";

describe("Monster", () => {
  const VARIANT_MONSTER_MAP: Record<string, string> = {
    party: "teal-big",
    celebrate: "teal-big",
    welcome: "blue-bottom-right",
    bored: "coral-left",
    sleeping: "coral-left",
    snarky: "tiny-red-top-left",
  };

  for (const [variant, monster] of Object.entries(VARIANT_MONSTER_MAP)) {
    it(`renders ${monster} for variant "${variant}"`, () => {
      const { container } = render(
        <Monster variant={variant as any} size={48} />
      );
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.getAttribute("src")).toBe(`/monsters/${monster}-256.png`);
    });
  }

  it("applies size as width and height", () => {
    const { container } = render(<Monster variant="party" size={64} />);
    const img = container.querySelector("img");
    expect(img!.getAttribute("width")).toBe("64");
    expect(img!.getAttribute("height")).toBe("64");
  });

  it("applies className", () => {
    const { container } = render(
      <Monster variant="party" size={48} className="mx-auto" />
    );
    const img = container.querySelector("img");
    expect(img!.className).toContain("mx-auto");
  });

  it("defaults size to 48", () => {
    const { container } = render(<Monster variant="party" />);
    const img = container.querySelector("img");
    expect(img!.getAttribute("width")).toBe("48");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/client/__tests__/Monster.test.tsx`
Expected: FAIL — Monster module not found

**Step 3: Write minimal implementation**

```tsx
// src/client/components/Monster.tsx
interface MonsterProps {
  readonly variant: "welcome" | "celebrate" | "bored" | "party" | "sleeping" | "snarky";
  readonly size?: number;
  readonly className?: string;
}

const VARIANT_TO_MONSTER: Record<MonsterProps["variant"], string> = {
  party: "teal-big",
  celebrate: "teal-big",
  welcome: "blue-bottom-right",
  bored: "coral-left",
  sleeping: "coral-left",
  snarky: "tiny-red-top-left",
};

export function Monster({ variant, size = 48, className = "" }: MonsterProps) {
  const monster = VARIANT_TO_MONSTER[variant];
  return (
    <img
      src={`/monsters/${monster}-256.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/client/__tests__/Monster.test.tsx`
Expected: PASS (all 8 tests)

**Step 5: Commit**

```
git add src/client/components/Monster.tsx src/client/__tests__/Monster.test.tsx
git commit -m "feat: add Monster component replacing Slurms SVG"
```

---

### Task 2: Update color palette

**Files:**
- Modify: `src/client/index.css` (lines 4-41, @theme block)

**Step 1: Add coral, teal-accent, and golden color tokens to @theme**

Add after the existing `--color-glow` line (line 31):

```css
/* Monster palette — from Molly's painting */
--color-coral-500: #E8836E;
--color-coral-600: #D4705C;
--color-teal-accent: #3BA8A0;
--color-golden: #D4A24E;
```

**Step 2: Update CSS references from orange to coral**

In the same file, update:
- Line 220-222: `submit-pulse` rgba from `249, 115, 22` → `232, 131, 110`
- Line 241-243: `card-warm` border/shadow from `249, 115, 22` → `232, 131, 110`
- Line 289: focus-visible outline from `--color-orange-500` → `--color-coral-500`
- Line 321-323: slider thumb from `--color-orange-500` → `--color-coral-500`, shadow from `249, 115, 22` → `232, 131, 110`
- Line 336-338: moz slider thumb same changes

**Step 3: Verify dev server renders correctly**

Run: `npm run dev` — visually inspect that colors appear
Run: `npx vitest run` — verify no test regressions

**Step 4: Commit**

```
git add src/client/index.css
git commit -m "feat: add monster palette colors (coral, teal, golden)"
```

---

### Task 3: Update personality text (Slurms → Chomps)

**Files:**
- Modify: `src/client/utils/personality.ts`
- Test: Existing tests + new assertions

**Step 1: Write failing test**

```tsx
// Add to existing test file or create src/client/__tests__/personality.test.ts
import { describe, it, expect } from "vitest";
import { randomQuote, randomLoadingMessage } from "../utils/personality";

describe("personality text rebrand", () => {
  it("randomQuote welcome does not contain Slurms", () => {
    // Run 20 times to catch randomized results
    for (let i = 0; i < 20; i++) {
      expect(randomQuote("welcome")).not.toContain("Slurms");
    }
  });

  it("randomQuote contains Chomps references", () => {
    // At least one quote in welcome pool should mention Chomps
    const quotes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      quotes.add(randomQuote("welcome"));
    }
    const hasChomps = [...quotes].some((q) => q.includes("Chomps"));
    expect(hasChomps).toBe(true);
  });

  it("randomLoadingMessage does not contain Slurms", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomLoadingMessage()).not.toContain("Slurms");
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/client/__tests__/personality.test.ts`
Expected: FAIL — quotes still contain "Slurms"

**Step 3: Update personality.ts**

Replace all instances in `src/client/utils/personality.ts`:
- "Slurms" → "Chomps" (all ~20 occurrences)
- "worm" → "monster" in context-specific lines (e.g., "worm of approval" → "monster of approval")
- "Slurms is a worm" → "Chomps is a monster"
- Update comment headers referencing Slurms

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/client/__tests__/personality.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/client/utils/personality.ts src/client/__tests__/personality.test.ts
git commit -m "feat: rebrand personality text from Slurms to Chomps"
```

---

### Task 4: Migrate consumer components — Batch 1 (core screens)

**Files to modify (import Slurms → Monster, JSX tag rename):**
- `src/client/App.tsx` (lines 11, 50, 98)
- `src/client/components/ErrorBoundary.tsx` (lines 3, 37, 42 — also update "Slurms is embarrassed" text)
- `src/client/components/OnboardingFlow.tsx` (lines 3, 52)
- `src/client/components/JoinScreen.tsx` (lines 2, 59)
- `src/client/components/SharePage.tsx` (lines 3, 43, 51)
- `src/client/components/InstallPrompt.tsx` (lines 2, 54)

**Step 1: In each file, replace:**
- `import { Slurms } from "./Slurms"` → `import { Monster } from "./Monster"`
- `<Slurms` → `<Monster` (all instances)
- ErrorBoundary line 42: `"Something went wrong. Slurms is embarrassed."` → `"Something went wrong. Chomps is embarrassed."`

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS (no behavioral changes)

**Step 3: Commit**

```
git add src/client/App.tsx src/client/components/ErrorBoundary.tsx src/client/components/OnboardingFlow.tsx src/client/components/JoinScreen.tsx src/client/components/SharePage.tsx src/client/components/InstallPrompt.tsx
git commit -m "refactor: migrate core screens from Slurms to Monster"
```

---

### Task 5: Migrate consumer components — Batch 2 (feature screens)

**Files to modify:**
- `src/client/components/RestaurantList.tsx` (lines 10, 311, 323, 338, 361)
- `src/client/components/RestaurantDetail.tsx` (lines 8, 104, 118, 217-220, 326)
- `src/client/components/RandomPicker.tsx` (lines 4, 109, 184-186)
- `src/client/components/ActivityFeed.tsx` (lines 4, 54, 62, 70)
- `src/client/components/FamilyStats.tsx` (lines 4, 61, 77, 93)
- `src/client/components/ProfilePage.tsx` (lines 5, 128, 339)

**Step 1: Same mechanical replacement as Task 4**

- `import { Slurms }` → `import { Monster }`
- `<Slurms` → `<Monster`
- Update any comments referencing "Slurms celebrates" etc.

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Commit**

```
git add src/client/components/RestaurantList.tsx src/client/components/RestaurantDetail.tsx src/client/components/RandomPicker.tsx src/client/components/ActivityFeed.tsx src/client/components/FamilyStats.tsx src/client/components/ProfilePage.tsx
git commit -m "refactor: migrate feature screens from Slurms to Monster"
```

---

### Task 6: Migrate consumer components — Batch 3 (flows + remaining)

**Files to modify:**
- `src/client/components/TonightFlow.tsx` (lines 5, 94, 137, 171)
- `src/client/components/TonightModeSelect.tsx` (lines 1, 14, 20, 31, 38 — rename `slurmsVariant` prop to `monsterVariant`)
- `src/client/components/SizzleFlow.tsx` (lines 6, 187)
- `src/client/components/ImportRestaurants.tsx` (lines 7, 305, 326)
- `src/client/components/GroupsPage.tsx` (lines 5, 131, 235)
- `src/client/components/InviteHandler.tsx` (lines 4, 29, 46)

**Step 1: Same mechanical replacement + TonightModeSelect rename**

- All files: `import { Slurms }` → `import { Monster }`, `<Slurms` → `<Monster`
- TonightModeSelect: rename `slurmsVariant` key to `monsterVariant` in MODES array and destructuring

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Delete old Slurms.tsx**

```
rm src/client/components/Slurms.tsx
```

**Step 4: Run full test suite to confirm nothing references Slurms**

Run: `npx vitest run`
Expected: PASS

**Step 5: Commit**

```
git add -u
git add src/client/components/TonightFlow.tsx src/client/components/TonightModeSelect.tsx src/client/components/SizzleFlow.tsx src/client/components/ImportRestaurants.tsx src/client/components/GroupsPage.tsx src/client/components/InviteHandler.tsx
git commit -m "refactor: complete Slurms to Monster migration, delete Slurms.tsx"
```

---

### Task 7: Color migration — swap orange-500 to coral-500 across components

**Files to modify:** All component files using `orange-500` classes (see grep results — ~25+ files, ~100+ instances)

**Step 1: Systematic replacement in component files**

Replace these Tailwind class patterns:
- `bg-orange-500` → `bg-coral-500`
- `bg-orange-600` → `bg-coral-600` (hover states)
- `hover:bg-orange-500` → `hover:bg-coral-500`
- `hover:bg-orange-600` → `hover:bg-coral-600`
- `text-orange-500` → `text-coral-500`
- `text-orange-400` → `text-coral-500` (keep readable on dark bg)
- `hover:text-orange-400` → `hover:text-coral-500`
- `border-orange-500` → `border-coral-500`
- `focus:border-orange-500` → `focus:border-coral-500`
- `focus:ring-orange-500` → `focus:ring-coral-500`
- `shadow-orange-500` → `shadow-coral-500`
- `bg-orange-500/20` → `bg-coral-500/20` (transparent variants)
- `border-orange-500/30` → `border-coral-500/30`
- `bg-orange-500/10` → `bg-coral-500/10`

Also replace raw orange rgba values:
- `rgba(249, 115, 22,` → `rgba(232, 131, 110,` (in inline styles or CSS)
- `rgba(249,115,22,` → `rgba(232,131,110,`

**Do NOT replace:**
- `bg-orange-500` in `personality.ts` AVATAR_COLORS array (keep as avatar option)

**Step 2: Update index.html theme-color**

In `index.html` line 6: `content="#f97316"` → `content="#E8836E"`

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: PASS

**Step 4: Run dev server and visually verify**

Run: `npm run dev` — check JoinScreen, RestaurantList, OnboardingFlow render with coral accent

**Step 5: Commit**

```
git add -u
git commit -m "feat: swap primary accent from orange to coral across all components"
```

---

### Task 8: PWA manifest and icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/icon-192.png` (generated from teal-big-256.png)
- Create: `public/icon-512.png` (generated from teal-big.png)
- Modify: `index.html` (add manifest link)

**Step 1: Create manifest.json**

```json
{
  "name": "Eat Sheet",
  "short_name": "Eat Sheet",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0c0a09",
  "theme_color": "#E8836E",
  "icons": [
    {
      "src": "/monsters/teal-big-256.png",
      "sizes": "256x256",
      "type": "image/png"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Generate PWA icon sizes using sips (macOS)**

```bash
# 192x192 from the 256px source
sips -z 192 192 public/monsters/teal-big-256.png --out public/icon-192.png

# 512x512 from the full-res source
sips -z 512 512 public/monsters/teal-big.png --out public/icon-512.png

# Apple touch icon 180x180
sips -z 180 180 public/monsters/teal-big-256.png --out public/apple-touch-icon.png
```

**Step 3: Update index.html**

Add manifest link in `<head>`:
```html
<link rel="manifest" href="/manifest.json" />
```

**Step 4: Replace favicon**

The current `favicon.svg` is likely the Slurms worm. Replace with a simple redirect to the monster PNG or create a favicon from the teal-big source:

```bash
# Create 32x32 favicon PNG
sips -z 32 32 public/monsters/teal-big-256.png --out public/favicon.png
```

Update `index.html` line 8:
```html
<link rel="icon" href="/favicon.png" type="image/png" />
```

**Step 5: Commit**

```
git add public/manifest.json public/icon-192.png public/icon-512.png public/apple-touch-icon.png public/favicon.png index.html
git rm public/favicon.svg
git commit -m "feat: add PWA manifest and monster icons"
```

---

### Task 9: Final verification and cleanup

**Step 1: Grep for any remaining Slurms references**

Run: `grep -ri "slurms" src/` — should return zero results

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 3: Build check**

Run: `npm run build`
Expected: Clean build, no errors

**Step 4: Visual smoke test**

Run: `npm run dev`
Check these screens:
- JoinScreen (welcome monster, coral accents)
- OnboardingFlow (3 slides with different monsters)
- RestaurantList (empty state, error state, loading state)
- RandomPicker (bored → celebrate transition)
- ErrorBoundary (snarky monster, "Chomps is embarrassed")
- FamilyStats (party, snarky, sleeping variants)

**Step 5: Final commit if any cleanup needed**

```
git add -u
git commit -m "chore: final cleanup for Matt's Monsters rebrand"
```
