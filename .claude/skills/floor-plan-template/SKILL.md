---
name: floor-plan-template
description: Add a new floor plan template to src/shared/templates/floor-plan.ts. Templates are shared between client (preview) and server (onboarding creation), so the new entry must use fractional coordinates and pass through the existing helpers (perimeterWalls, perimeterWithDoor, etc).
disable-model-invocation: true
---

# Floor Plan Template

Scaffold a new template in `src/shared/templates/floor-plan.ts`.

## Why this is shared

`TEMPLATES` is exported from `src/shared/` because both sides need it:

- **Client preview** — `StepFloorPlan` builds a payload at the chosen size and renders it in `TemplateMiniPreview` so the user sees what they're about to get.
- **Server creation** — `completeOnboarding()` looks up the same template by id and writes it to D1 via `createFloorPlan` + `saveFloorPlan`.

If the two sides drift, the preview lies. Edit only `src/shared/templates/floor-plan.ts`; `src/client/features/floor-plan/templates.ts` re-exports.

## Anatomy of a template

```ts
{
  name: "Wine Bar",
  description: "Counter seating + a few high-tops",
  icon: "🍷",
  build: (w, h) => ({
    canvasWidth: w,
    canvasHeight: h,
    tables: [
      // Use fractional positions so layouts scale across all 4 TEMPLATE_SIZES.
      { id: nanoid(), x: 0.2 * w, y: 0.5 * h, width: 60, height: 60,
        rotation: 0, label: "1", shape: "circle",
        minCapacity: 2, maxCapacity: 2, sectionId: null },
      // ...
    ],
    sections: [
      { id: nanoid(), x: 0.05 * w, y: 0.05 * h,
        width: 0.4 * w, height: 0.2 * h,
        name: "Bar", color: "#8B7355" },
    ],
    walls: perimeterWalls(w, h),
  }),
}
```

## Steps

1. Decide name. The id is derived via `templateIdFromName()` (lowercase, hyphenated). Avoid colliding with existing ids — `grep -i "name:" src/shared/templates/floor-plan.ts`.
2. Pick an emoji icon (single character, used by `TemplatePicker`).
3. Build the table set:
   - **Use fractional positions** (`0.5 * w`, `0.3 * h`) so the layout fills any of the 4 `TEMPLATE_SIZES` (Cozy 800×600 → Grand 2000×1200).
   - Table dimensions stay absolute (60×60 for round 4-tops, 40×40 for 2-tops, 80×40 for booths/long tables — see existing templates for conventions).
   - Each table needs `id` (`nanoid()`), `label` (string number usually), `shape` (`"circle" | "square" | "rectangle"`), `minCapacity`, `maxCapacity`, `sectionId` (null unless inside a section), and `rotation` (degrees).
4. Optional sections (Bar, Patio, Private Dining): give them a name and color, then drop tables onto them via `sectionId`.
5. Walls — use `perimeterWalls(w, h)` for a closed room, or `perimeterWithDoor(w, h, side, pos, gap)` for an entry. Custom interior walls are `{ id, x1, y1, x2, y2, thickness, wallType?: "wall" | "window" }`.
6. Add a test in `src/client/features/onboarding/__tests__/StepFloorPlan.test.tsx` confirming the new name renders. The other behaviors (recommendation, preview) are covered generically.
7. Verify:
   ```bash
   pnpm typecheck
   pnpm test
   pnpm dev # eyeball the preview at all 4 sizes in StepFloorPlan
   ```

## Conventions baked in (per CLAUDE.md)

- **Konva layers**: walls + sections + tables must be in the same `<Layer>`. Templates already produce flat arrays; renderer handles layering.
- **Backward compat**: old `layout_data` may lack `walls` — always use `data.layoutData.walls ?? []`. Server creation paths handle this; client renders the template payload directly so it always has walls.
- **Auto perimeter walls** apply only to *user-created* floor plans (POST then PUT). Templates supply their own walls.
- **`onboarding` filter**: `ONBOARDING_TEMPLATES = TEMPLATES.filter(t => t.name !== "Blank")` in `StepFloorPlan.tsx` excludes the Blank template by name. If you add a template named "Blank" or rename the existing one, that filter breaks silently.

## Don't

- Don't put per-size hardcoded coordinates ("at 1200×800 the table is at 600,400"). Always fractional.
- Don't omit `sectionId` (the type requires it; pass `null` if the table isn't in a section).
- Don't skip `nanoid()` ids — D1's `TEXT PRIMARY KEY` doesn't auto-generate.
- Don't forget the icon — `TemplatePicker` will render an empty card.
