# Floor Plan Onboarding Step

Integrate the floor plan editor's template picker into the venue creation onboarding flow as a new optional step.

## Context

The floor plan editor and venue creation are currently separate experiences. Users create a venue via onboarding (5 steps), then navigate to `/floor-plan` from the Dashboard sidebar to set up their layout. This design adds a floor plan step to onboarding so users can choose a starting layout during venue setup.

## User Flow

6-step onboarding (updated from 5):

| Step | Name | Required? | Data Collected |
|------|------|-----------|----------------|
| 1 | Venue Info | Yes | name, type, cuisines |
| 2 | Location | Yes (timezone) | address, timezone, phone, website |
| 3 | Logo | No (Skip) | logo image, extracted colors |
| 4 | Brand | Yes | accent color |
| **5** | **Floor Plan** | **No (Skip)** | **table count, seat count, template, size** |
| 6 | Welcome | Yes | triggers completion |

## Step 5: Floor Plan

### Layout

Split-panel design matching existing onboarding aesthetic:

**Left panel — Inputs + Template Picker:**
- **Table count** — number input, optional, placeholder "e.g. 12"
- **Seat count** — number input, optional, placeholder "e.g. 48"
- **Template grid** — 2x3 grid of 6 existing templates (Fine Dining, Casual Bistro, Bar & Lounge, Cafe, Banquet Hall, Open Kitchen). Each card shows a mini icon, name, and table count.
- **"Recommended" badge** — appears on the best-fit template when table count is entered. Match logic: template whose default table count has the smallest absolute difference from the user's input. Ties broken by seat count proximity if provided, otherwise first match wins. Badge hidden when no count is entered.
- **Room size selector** — 2x2 grid (Cozy / Standard / Spacious / Grand). Auto-selects based on table count: <=8 Cozy, <=14 Standard, <=20 Spacious, >20 Grand. User can override.

**Right panel — Read-only Preview:**
- Static HTML/CSS rendering of the selected template's layout (styled divs, not Konva)
- Shows walls, sections (with labels), and table positions
- Summary pill: "{N} tables - {N} sections"
- Subtitle: "You can customize this later in the editor"

**Footer:**
- Back button (to Step 4)
- Skip button (sets floorPlan to null, advances to Welcome)
- Continue button (stores selection in onboarding state, advances to Welcome)

## Step 6: Welcome (Enhanced)

**When floor plan was selected:**
- App shell preview includes a floor plan thumbnail in the main content area
- Thumbnail uses the same static HTML/CSS renderer as the Step 5 preview (smaller scale)
- Summary line below thumbnail: "Fine Dining - 16 tables - 2 sections"
- Sidebar nav highlights "Floor Plan" with a checkmark

**When Step 5 was skipped:**
- No floor plan thumbnail — existing dashboard stats preview shown
- Sidebar shows "Floor Plan" without checkmark (current behavior)

## Data Flow

### Client State

Extend `useOnboarding` reducer:
- New action: `SET_FLOOR_PLAN` with payload `{ tableCount?: number, seatCount?: number, templateId: string, size: string } | null`
- State gains `floorPlan` field alongside existing `venueInfo`, `location`, `brand`, `logoUrl`
- Step count: 5 -> 6, Welcome moves from step 5 to step 6

### Onboarding Complete Payload

Extend `onboardingCompleteSchema` with optional field:

```
floorPlan?: {
  tableCount?: number
  seatCount?: number
  templateId: string    // "fine-dining", "casual-bistro", etc.
  size: string          // "cozy", "standard", "spacious", "grand"
}
```

### Server: `completeOnboarding()`

After creating venue + theme + membership (existing logic), if `floorPlan` is present:

1. Resolve canvas dimensions from `size` (reuse existing size map)
2. Insert `floor_plans` row: name "Floor 1", tenant_id, canvas dimensions
3. Call template `build(width, height)` to generate layout data
4. Insert tables, sections, and layout_data in the same batch transaction

If `floorPlan` is absent, no floor plan is created (existing behavior preserved).

### Shared Template Logic

Extract template `build()` functions from `src/client/features/floor-plan/templates.ts` to `src/shared/templates/floor-plan.ts`:

- Pure functions that produce plain data objects (tables, sections, walls)
- No Konva or React dependency
- Client imports for preview rendering + template picker
- Server imports for floor plan creation during onboarding
- Original client file re-exports from shared (or becomes thin wrapper for any client-only helpers)

## Component Architecture

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `StepFloorPlan.tsx` | `src/client/features/onboarding/components/` | Step container: count inputs, template grid, size selector, preview |
| `TemplateMiniPreview.tsx` | `src/client/features/onboarding/components/` | Static HTML/CSS floor plan renderer from template build output. Reused in Welcome thumbnail. |

### Modified Components

| Component | Change |
|-----------|--------|
| `useOnboarding.ts` | Add step 5 (floor plan), bump Welcome to step 6, `SET_FLOOR_PLAN` action, `floorPlan` state field |
| `Onboarding.tsx` | Render `StepFloorPlan` at step 5, update step count to 6 |
| `StepWelcome.tsx` | Conditionally render `TemplateMiniPreview` thumbnail when `floorPlan` present |

### Server Changes

| File | Change |
|------|--------|
| `src/shared/schemas/venue.ts` | Extend `onboardingCompleteSchema` with optional `floorPlan` field |
| `src/server/features/onboarding/service.ts` | Create floor plan record + populate from template when `floorPlan` present |

### No Changes To

- Floor plan routes, repository, or editor
- Database schema (no new tables or columns)
- Existing onboarding steps 1-4

## Testing

### Unit Tests

| Test | Coverage |
|------|----------|
| `StepFloorPlan.test.tsx` | Template selection updates state, size auto-selects from table count, "Recommended" badge for best-fit, Skip sets null, Continue stores selection |
| `TemplateMiniPreview.test.tsx` | Renders correct table/section/wall elements, handles empty layout |
| `useOnboarding.test.ts` | `SET_FLOOR_PLAN` action, step count is 6, Welcome is step 6 |
| `onboarding/service.test.ts` | `completeOnboarding()` with floorPlan creates record + tables + sections; without floorPlan creates nothing (existing behavior) |
| `shared/templates/floor-plan.test.ts` | Each template `build()` returns valid data, fractional coordinates scale correctly |

### E2E Tests (Playwright)

Extend `e2e/onboarding.spec.ts`:
- Happy path: enter counts, pick template, pick size, verify preview, continue, verify Welcome thumbnail, complete
- Skip path: click Skip, verify Welcome has no thumbnail, complete
- Back navigation: Step 6 -> Step 5 preserves selection

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Step placement | After Brand (step 5 of 6) | User has defined venue identity; now sets up physical space. Welcome stays as the satisfying finale. |
| Editor scope | Template picker + read-only preview | Balances tangible "my restaurant" moment with low cognitive load. Full editor available from Dashboard. |
| Required? | Optional with Skip | Matches Logo step pattern. Not every owner knows their layout on day one. |
| Table/seat input | On the floor plan step | Contextual — user thinks about tables when looking at floor plans, not when naming the venue. |
| Input influence | Auto-recommend badge + auto-size | Uses data meaningfully without restricting template choice. |
| Welcome enhancement | Add floor plan thumbnail | Enriches existing preview without replacing what works. Reinforces setup completion. |
| Template logic | Extract to src/shared/ | Enables server-side floor plan creation without duplicating template code. |
| Floor plan creation | Server-side in completeOnboarding() | Same atomic transaction as venue creation. No orphaned records if onboarding fails. |
