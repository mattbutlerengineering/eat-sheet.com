# Floor Plan Onboarding Step — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional floor plan template picker as step 5 of a 6-step onboarding flow, with a read-only preview and enhanced Welcome step showing the chosen layout.

**Architecture:** Extract shared template logic to `src/shared/`, add `SET_FLOOR_PLAN` action to onboarding reducer, create `StepFloorPlan` + `TemplateMiniPreview` components, extend `completeOnboarding()` to create floor plan records server-side when a template is selected.

**Tech Stack:** React 19, Framer Motion, Zod, Hono, D1, Vitest, Playwright

---

### Task 1: Extract template definitions to shared module

**Files:**
- Create: `src/shared/templates/floor-plan.ts`
- Modify: `src/client/features/floor-plan/templates.ts`
- Modify: `src/client/features/floor-plan/components/TemplatePicker.tsx`
- Test: `src/shared/templates/__tests__/floor-plan.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/shared/templates/__tests__/floor-plan.test.ts
import { describe, it, expect } from "vitest";
import { TEMPLATES, TEMPLATE_SIZES, type FloorPlanTemplate } from "../floor-plan";

describe("shared floor plan templates", () => {
  it("exports 7 templates", () => {
    expect(TEMPLATES).toHaveLength(7);
  });

  it("exports 4 sizes", () => {
    expect(TEMPLATE_SIZES).toHaveLength(4);
  });

  it("each template has required fields", () => {
    for (const t of TEMPLATES) {
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(typeof t.build).toBe("function");
    }
  });

  it("Fine Dining build returns valid payload at Standard size", () => {
    const fineDining = TEMPLATES.find((t) => t.name === "Fine Dining")!;
    const payload = fineDining.build(1200, 800);

    expect(payload.canvasWidth).toBe(1200);
    expect(payload.canvasHeight).toBe(800);
    expect(payload.tables.length).toBeGreaterThan(0);
    expect(payload.sections.length).toBeGreaterThan(0);
    expect(payload.walls.length).toBeGreaterThan(0);

    // Every table has required fields
    for (const t of payload.tables) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(["circle", "square", "rectangle"]).toContain(t.shape);
      expect(t.minCapacity).toBeLessThanOrEqual(t.maxCapacity);
    }
  });

  it("fractional coords scale to different canvas sizes", () => {
    const bistro = TEMPLATES.find((t) => t.name === "Casual Bistro")!;
    const small = bistro.build(800, 600);
    const large = bistro.build(2000, 1200);

    // Same number of tables
    expect(small.tables.length).toBe(large.tables.length);

    // Positions scale proportionally — first table X should be smaller in small canvas
    expect(small.tables[0]!.x).toBeLessThan(large.tables[0]!.x);
  });

  it("TEMPLATE_SIZES have width and height", () => {
    for (const s of TEMPLATE_SIZES) {
      expect(s.label).toBeTruthy();
      expect(s.width).toBeGreaterThan(0);
      expect(s.height).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/shared/templates/__tests__/floor-plan.test.ts`
Expected: FAIL — module `../floor-plan` not found

- [ ] **Step 3: Create shared template module**

Create `src/shared/templates/floor-plan.ts` by moving the full contents of `src/client/features/floor-plan/templates.ts` and adding the `TEMPLATE_SIZES` constant:

```typescript
// src/shared/templates/floor-plan.ts
import { nanoid } from "nanoid";
import type {
  SaveFloorPlanPayload,
  SaveTablePayload,
  SaveWallPayload,
  SaveSectionPayload,
} from "@shared/types/floor-plan";

export interface FloorPlanTemplate {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly build: (w: number, h: number) => SaveFloorPlanPayload;
}

export interface TemplateSize {
  readonly label: string;
  readonly sub: string;
  readonly width: number;
  readonly height: number;
}

// --- Sizes ---

export const TEMPLATE_SIZES: readonly TemplateSize[] = [
  { label: "Cozy", sub: "~1,000 sq ft", width: 800, height: 600 },
  { label: "Standard", sub: "~2,000 sq ft", width: 1200, height: 800 },
  { label: "Spacious", sub: "~3,500 sq ft", width: 1600, height: 1000 },
  { label: "Grand", sub: "~5,000 sq ft", width: 2000, height: 1200 },
] as const;

// --- Helpers ---
// Copy these functions verbatim from src/client/features/floor-plan/templates.ts:
//   perimeterWalls, perimeterWithDoor, WL, WIN, SEC, R, SQ, LT
// Then copy the full TEMPLATES array (all 7 entries: Blank, Fine Dining,
//   Casual Bistro, Bar & Lounge, Café, Banquet Hall, Open Kitchen).
// Do not modify any logic — only move the code to this new location.
// The entire file is ~322 lines. Copy lines 11-322 from the existing file.
```

Copy the full file contents — every helper function and all 7 template definitions. Do NOT modify any logic, only add the `TEMPLATE_SIZES` export and `TemplateSize` type.

- [ ] **Step 4: Update client templates to re-export from shared**

Replace `src/client/features/floor-plan/templates.ts` with:

```typescript
// src/client/features/floor-plan/templates.ts
export {
  TEMPLATES,
  TEMPLATE_SIZES,
  type FloorPlanTemplate,
  type TemplateSize,
} from "@shared/templates/floor-plan";
```

- [ ] **Step 5: Update TemplatePicker to use shared TEMPLATE_SIZES**

In `src/client/features/floor-plan/components/TemplatePicker.tsx`, replace the local `SIZES` constant:

```typescript
// Remove this:
const SIZES = [
  { label: "Cozy", sub: "~1,000 sq ft", width: 800, height: 600 },
  { label: "Standard", sub: "~2,000 sq ft", width: 1200, height: 800 },
  { label: "Spacious", sub: "~3,500 sq ft", width: 1600, height: 1000 },
  { label: "Grand", sub: "~5,000 sq ft", width: 2000, height: 1200 },
] as const;

// Add this import:
import { TEMPLATE_SIZES } from "@shared/templates/floor-plan";

// Replace all references to SIZES with TEMPLATE_SIZES
```

- [ ] **Step 6: Run tests to verify everything passes**

Run: `pnpm test src/shared/templates/__tests__/floor-plan.test.ts`
Expected: PASS — all 6 tests green

Run: `pnpm build`
Expected: PASS — TypeScript + Vite build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/shared/templates/ src/client/features/floor-plan/templates.ts src/client/features/floor-plan/components/TemplatePicker.tsx
git commit -m "refactor: extract floor plan templates to shared module"
```

---

### Task 2: Extend onboarding reducer with floor plan state

**Files:**
- Modify: `src/client/features/onboarding/hooks/useOnboarding.ts`
- Modify: `src/client/features/onboarding/__tests__/useOnboarding.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/client/features/onboarding/__tests__/useOnboarding.test.ts`:

```typescript
import type { VenueInfoInput, VenueLocationInput } from "@shared/schemas";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

// ... existing tests ...

it("does not advance past step 6", () => {
  const atStep6 = { ...initialState, currentStep: 6 };
  const result = onboardingReducer(atStep6, { type: "NEXT" });
  expect(result.currentStep).toBe(6);
});

it("SET_FLOOR_PLAN sets floor plan selection", () => {
  const selection: FloorPlanSelection = {
    templateId: "fine-dining",
    size: "standard",
    tableCount: 16,
    seatCount: 64,
  };
  const result = onboardingReducer(initialState, {
    type: "SET_FLOOR_PLAN",
    payload: selection,
  });
  expect(result.floorPlan).toEqual(selection);
});

it("SET_FLOOR_PLAN with null clears selection", () => {
  const withPlan = {
    ...initialState,
    floorPlan: { templateId: "fine-dining", size: "standard" } as FloorPlanSelection,
  };
  const result = onboardingReducer(withPlan, {
    type: "SET_FLOOR_PLAN",
    payload: null,
  });
  expect(result.floorPlan).toBeNull();
});

it("initial state has floorPlan as null", () => {
  expect(initialState.floorPlan).toBeNull();
});
```

Also update the existing test:

```typescript
// Change from:
it("does not advance past step 5", () => {
  const atStep5 = { ...initialState, currentStep: 5 };
  const result = onboardingReducer(atStep5, { type: "NEXT" });
  expect(result.currentStep).toBe(5);
});

// Change to:
it("does not advance past step 6", () => {
  const atStep6 = { ...initialState, currentStep: 6 };
  const result = onboardingReducer(atStep6, { type: "NEXT" });
  expect(result.currentStep).toBe(6);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/client/features/onboarding/__tests__/useOnboarding.test.ts`
Expected: FAIL — `FloorPlanSelection` not found, step 5 cap test fails

- [ ] **Step 3: Update the reducer**

In `src/client/features/onboarding/hooks/useOnboarding.ts`:

```typescript
// Add after existing imports:
export interface FloorPlanSelection {
  readonly templateId: string;
  readonly size: string;
  readonly tableCount?: number | undefined;
  readonly seatCount?: number | undefined;
}

// Update OnboardingState — add floorPlan field:
export interface OnboardingState {
  readonly currentStep: number;
  readonly direction: 1 | -1;
  readonly venueInfo: VenueInfoInput | null;
  readonly location: VenueLocationInput | null;
  readonly logoResult: {
    logoUrl: string;
    extractedColors: readonly string[];
  } | null;
  readonly brand: VenueBrandInput | null;
  readonly floorPlan: FloorPlanSelection | null;
  readonly isSubmitting: boolean;
  readonly error: string | null;
}

// Update OnboardingAction union — add SET_FLOOR_PLAN:
type OnboardingAction =
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SET_VENUE_INFO"; payload: VenueInfoInput }
  | { type: "SET_LOCATION"; payload: VenueLocationInput }
  | {
      type: "SET_LOGO_RESULT";
      payload: { logoUrl: string; extractedColors: readonly string[] };
    }
  | { type: "SET_BRAND"; payload: VenueBrandInput }
  | { type: "SET_FLOOR_PLAN"; payload: FloorPlanSelection | null }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; payload: string };

// Update initialState — add floorPlan: null:
export const initialState: OnboardingState = {
  currentStep: 1,
  direction: 1,
  venueInfo: null,
  location: null,
  logoResult: null,
  brand: null,
  floorPlan: null,
  isSubmitting: false,
  error: null,
};

// Update MAX_STEP:
const MAX_STEP = 6;

// Add case to reducer switch:
case "SET_FLOOR_PLAN":
  return { ...state, floorPlan: action.payload };
```

Add to the `useOnboarding()` return object:

```typescript
setFloorPlan: (payload: FloorPlanSelection | null) =>
  dispatch({ type: "SET_FLOOR_PLAN", payload }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/client/features/onboarding/__tests__/useOnboarding.test.ts`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add src/client/features/onboarding/hooks/useOnboarding.ts src/client/features/onboarding/__tests__/useOnboarding.test.ts
git commit -m "feat: add floor plan selection to onboarding state"
```

---

### Task 3: Create TemplateMiniPreview component

**Files:**
- Create: `src/client/features/onboarding/components/TemplateMiniPreview.tsx`
- Test: `src/client/features/onboarding/__tests__/TemplateMiniPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/client/features/onboarding/__tests__/TemplateMiniPreview.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateMiniPreview } from "../components/TemplateMiniPreview";
import type { SaveFloorPlanPayload } from "@shared/types/floor-plan";
import { nanoid } from "nanoid";

const mockPayload: SaveFloorPlanPayload = {
  canvasWidth: 1200,
  canvasHeight: 800,
  tables: [
    { id: nanoid(), label: "T1", shape: "circle", minCapacity: 3, maxCapacity: 4, sectionId: null, x: 100, y: 100, width: 52, height: 52, rotation: 0 },
    { id: nanoid(), label: "T2", shape: "square", minCapacity: 3, maxCapacity: 4, sectionId: null, x: 200, y: 200, width: 56, height: 56, rotation: 0 },
  ],
  sections: [
    { id: nanoid(), name: "Main Dining", color: "#8B7355", x: 10, y: 10, width: 500, height: 700 },
  ],
  walls: [
    { id: nanoid(), x1: 0, y1: 0, x2: 1200, y2: 0, thickness: 6 },
  ],
};

describe("TemplateMiniPreview", () => {
  it("renders tables as positioned divs", () => {
    render(<TemplateMiniPreview payload={mockPayload} />);
    expect(screen.getByText("T1")).toBeInTheDocument();
    expect(screen.getByText("T2")).toBeInTheDocument();
  });

  it("renders section labels", () => {
    render(<TemplateMiniPreview payload={mockPayload} />);
    expect(screen.getByText("Main Dining")).toBeInTheDocument();
  });

  it("renders with custom height", () => {
    const { container } = render(<TemplateMiniPreview payload={mockPayload} height={200} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.height).toBe("200px");
  });

  it("handles empty payload gracefully", () => {
    const empty: SaveFloorPlanPayload = {
      canvasWidth: 800, canvasHeight: 600,
      tables: [], sections: [], walls: [],
    };
    const { container } = render(<TemplateMiniPreview payload={empty} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/client/features/onboarding/__tests__/TemplateMiniPreview.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TemplateMiniPreview**

```typescript
// src/client/features/onboarding/components/TemplateMiniPreview.tsx
import type { SaveFloorPlanPayload } from "@shared/types/floor-plan";

interface TemplateMiniPreviewProps {
  readonly payload: SaveFloorPlanPayload;
  readonly height?: number | undefined;
}

const floorStyle: React.CSSProperties = {
  background: "#d4cfc8",
  borderRadius: "var(--rialto-radius-default, 8px)",
  position: "relative",
  overflow: "hidden",
  width: "100%",
};

export function TemplateMiniPreview({ payload, height = 300 }: TemplateMiniPreviewProps) {
  const { canvasWidth, canvasHeight, tables, sections, walls } = payload;
  const scaleX = 100 / canvasWidth;
  const scaleY = 100 / canvasHeight;

  return (
    <div style={{ ...floorStyle, height }} aria-label="Floor plan preview" role="img">
      {/* Walls */}
      {walls.map((w) => {
        const isHoriz = Math.abs(w.y2 - w.y1) < Math.abs(w.x2 - w.x1);
        const isWindow = w.wallType === "window";
        const left = Math.min(w.x1, w.x2) * scaleX;
        const top = Math.min(w.y1, w.y2) * scaleY;
        const wPct = isHoriz
          ? Math.abs(w.x2 - w.x1) * scaleX
          : (w.thickness * scaleX);
        const hPct = isHoriz
          ? (w.thickness * scaleY)
          : Math.abs(w.y2 - w.y1) * scaleY;

        return (
          <div
            key={w.id}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              width: `${wPct}%`,
              height: `${hPct}%`,
              background: isWindow ? "rgba(135,206,235,0.4)" : "#5a4a3a",
              borderRadius: isWindow ? 1 : 0,
            }}
          />
        );
      })}

      {/* Sections */}
      {sections.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x * scaleX}%`,
            top: `${s.y * scaleY}%`,
            width: `${s.width * scaleX}%`,
            height: `${s.height * scaleY}%`,
            background: `${s.color}15`,
            borderRadius: 3,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 4,
              left: 6,
              fontSize: 9,
              fontFamily: "var(--rialto-font-sans, system-ui)",
              fontWeight: 600,
              color: s.color,
              whiteSpace: "nowrap",
            }}
          >
            {s.name}
          </span>
        </div>
      ))}

      {/* Tables */}
      {tables.map((t) => (
        <div
          key={t.id}
          style={{
            position: "absolute",
            left: `${t.x * scaleX}%`,
            top: `${t.y * scaleY}%`,
            width: `${t.width * scaleX}%`,
            height: `${t.height * scaleY}%`,
            background: "#8B7355",
            borderRadius: t.shape === "circle" ? "50%" : 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 7,
            fontFamily: "var(--rialto-font-sans, system-ui)",
            fontWeight: 700,
            color: "#d4cfc8",
            transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/client/features/onboarding/__tests__/TemplateMiniPreview.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/features/onboarding/components/TemplateMiniPreview.tsx src/client/features/onboarding/__tests__/TemplateMiniPreview.test.tsx
git commit -m "feat: add TemplateMiniPreview component for onboarding"
```

---

### Task 4: Create StepFloorPlan component

**Files:**
- Create: `src/client/features/onboarding/components/StepFloorPlan.tsx`
- Test: `src/client/features/onboarding/__tests__/StepFloorPlan.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/client/features/onboarding/__tests__/StepFloorPlan.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepFloorPlan } from "../components/StepFloorPlan";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

describe("StepFloorPlan", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it("renders template grid with 6 non-blank templates", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    expect(screen.getByText("Fine Dining")).toBeInTheDocument();
    expect(screen.getByText("Casual Bistro")).toBeInTheDocument();
    expect(screen.getByText("Bar & Lounge")).toBeInTheDocument();
    expect(screen.getByText("Café")).toBeInTheDocument();
    expect(screen.getByText("Banquet Hall")).toBeInTheDocument();
    expect(screen.getByText("Open Kitchen")).toBeInTheDocument();
    expect(screen.queryByText("Blank")).not.toBeInTheDocument();
  });

  it("renders size selector with 4 sizes", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    expect(screen.getByText("Cozy")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Spacious")).toBeInTheDocument();
    expect(screen.getByText("Grand")).toBeInTheDocument();
  });

  it("calls onChange when a template is selected", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("Fine Dining"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: "fine-dining" }),
    );
  });

  it("shows Recommended badge when table count matches", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    const tableInput = screen.getByPlaceholderText("e.g. 12");
    fireEvent.change(tableInput, { target: { value: "8" } });
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("auto-selects size based on table count", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    const tableInput = screen.getByPlaceholderText("e.g. 12");
    fireEvent.change(tableInput, { target: { value: "25" } });
    // Grand should be auto-selected for >20 tables
    // onChange should have been called with size "grand"
    fireEvent.click(screen.getByText("Fine Dining"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ size: "grand" }),
    );
  });

  it("renders preview when a template is selected", () => {
    const selection: FloorPlanSelection = {
      templateId: "fine-dining",
      size: "standard",
    };
    render(<StepFloorPlan data={selection} onChange={onChange} />);
    expect(screen.getByRole("img", { name: /floor plan preview/i })).toBeInTheDocument();
  });

  it("renders table and seat count inputs", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    expect(screen.getByPlaceholderText("e.g. 12")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 48")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/client/features/onboarding/__tests__/StepFloorPlan.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StepFloorPlan**

```typescript
// src/client/features/onboarding/components/StepFloorPlan.tsx
import { useState, useMemo } from "react";
import { TEMPLATES, TEMPLATE_SIZES } from "@shared/templates/floor-plan";
import { TemplateMiniPreview } from "./TemplateMiniPreview";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

interface StepFloorPlanProps {
  readonly data: FloorPlanSelection | null;
  readonly onChange: (selection: FloorPlanSelection | null) => void;
}

// Exclude Blank from onboarding — it has no tables
const ONBOARDING_TEMPLATES = TEMPLATES.filter((t) => t.name !== "Blank");

function templateIdFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function autoSelectSize(tableCount: number): string {
  if (tableCount <= 8) return "cozy";
  if (tableCount <= 14) return "standard";
  if (tableCount <= 20) return "spacious";
  return "grand";
}

function findRecommendedTemplate(
  tableCount: number | undefined,
): string | null {
  if (!tableCount || tableCount <= 0) return null;

  // Build a standard-size layout for each template and compare table counts
  let bestId: string | null = null;
  let bestDiff = Infinity;

  for (const t of ONBOARDING_TEMPLATES) {
    const payload = t.build(1200, 800);
    const diff = Math.abs(payload.tables.length - tableCount);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = templateIdFromName(t.name);
    }
  }

  return bestId;
}

const wrapperStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "340px 1fr",
  gap: 0,
  minHeight: 420,
  borderRadius: "var(--rialto-radius-soft, 12px)",
  border: "1px solid var(--rialto-border)",
  overflow: "hidden",
  background: "var(--rialto-surface)",
};

const leftPanelStyle: React.CSSProperties = {
  padding: "var(--rialto-space-lg, 24px)",
  borderRight: "1px solid var(--rialto-border)",
  overflowY: "auto",
};

const rightPanelStyle: React.CSSProperties = {
  padding: "var(--rialto-space-lg, 24px)",
  display: "flex",
  flexDirection: "column",
};

const inputRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--rialto-space-sm, 8px)",
  marginBottom: "var(--rialto-space-md, 16px)",
};

const inputStyle: React.CSSProperties = {
  padding: "var(--rialto-space-xs, 8px) var(--rialto-space-sm, 10px)",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  border: "1px solid var(--rialto-border)",
  background: "var(--rialto-surface-recessed)",
  color: "var(--rialto-text-primary)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  width: "100%",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-text-secondary)",
  marginBottom: 4,
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-md, 15px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary)",
  margin: "0 0 4px",
};

const subheadingStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  color: "var(--rialto-text-tertiary)",
  margin: "0 0 var(--rialto-space-md, 16px)",
};

const templateGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--rialto-space-xs, 8px)",
  marginBottom: "var(--rialto-space-lg, 20px)",
};

const sizeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--rialto-space-xs, 6px)",
};

const summaryPillStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-text-tertiary)",
  background: "var(--rialto-surface-recessed)",
  padding: "4px 10px",
  borderRadius: "var(--rialto-radius-sharp, 4px)",
};

export function StepFloorPlan({ data, onChange }: StepFloorPlanProps) {
  const [tableCount, setTableCount] = useState<number | undefined>(
    data?.tableCount,
  );
  const [seatCount, setSeatCount] = useState<number | undefined>(
    data?.seatCount,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    data?.templateId ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    data?.size ?? "standard",
  );

  const recommendedId = useMemo(
    () => findRecommendedTemplate(tableCount),
    [tableCount],
  );

  const selectedTemplate = useMemo(
    () =>
      selectedTemplateId
        ? ONBOARDING_TEMPLATES.find(
            (t) => templateIdFromName(t.name) === selectedTemplateId,
          ) ?? null
        : null,
    [selectedTemplateId],
  );

  const sizeEntry = useMemo(
    () =>
      TEMPLATE_SIZES.find((s) => s.label.toLowerCase() === selectedSize) ??
      TEMPLATE_SIZES[1]!,
    [selectedSize],
  );

  const preview = useMemo(
    () =>
      selectedTemplate
        ? selectedTemplate.build(sizeEntry.width, sizeEntry.height)
        : null,
    [selectedTemplate, sizeEntry],
  );

  function emitChange(
    templateId: string | null,
    size: string,
    tc?: number | undefined,
    sc?: number | undefined,
  ) {
    if (templateId) {
      onChange({ templateId, size, tableCount: tc, seatCount: sc });
    } else {
      onChange(null);
    }
  }

  function handleTableCountChange(value: string) {
    const parsed = value === "" ? undefined : parseInt(value, 10);
    const tc = parsed && !isNaN(parsed) && parsed > 0 ? parsed : undefined;
    setTableCount(tc);
    if (tc) {
      const newSize = autoSelectSize(tc);
      setSelectedSize(newSize);
      emitChange(selectedTemplateId, newSize, tc, seatCount);
    }
  }

  function handleSeatCountChange(value: string) {
    const parsed = value === "" ? undefined : parseInt(value, 10);
    const sc = parsed && !isNaN(parsed) && parsed > 0 ? parsed : undefined;
    setSeatCount(sc);
    if (selectedTemplateId) {
      emitChange(selectedTemplateId, selectedSize, tableCount, sc);
    }
  }

  function handleTemplateClick(name: string) {
    const id = templateIdFromName(name);
    setSelectedTemplateId(id);
    emitChange(id, selectedSize, tableCount, seatCount);
  }

  function handleSizeClick(label: string) {
    const size = label.toLowerCase();
    setSelectedSize(size);
    emitChange(selectedTemplateId, size, tableCount, seatCount);
  }

  return (
    <div style={wrapperStyle}>
      {/* Left panel: inputs + template picker */}
      <div style={leftPanelStyle}>
        <h3 style={headingStyle}>Choose a Layout</h3>
        <p style={subheadingStyle}>Pick a starting template for your restaurant</p>

        {/* Table / seat count inputs */}
        <div style={inputRowStyle}>
          <div>
            <div style={labelStyle}>Tables</div>
            <input
              type="number"
              min={1}
              max={200}
              placeholder="e.g. 12"
              value={tableCount ?? ""}
              onChange={(e) => handleTableCountChange(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>Total seats</div>
            <input
              type="number"
              min={1}
              max={1000}
              placeholder="e.g. 48"
              value={seatCount ?? ""}
              onChange={(e) => handleSeatCountChange(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Template grid */}
        <div style={templateGridStyle}>
          {ONBOARDING_TEMPLATES.map((t) => {
            const id = templateIdFromName(t.name);
            const isSelected = id === selectedTemplateId;
            const isRecommended = id === recommendedId;
            const count = t.build(1200, 800).tables.length;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTemplateClick(t.name)}
                aria-pressed={isSelected}
                style={{
                  padding: "var(--rialto-space-sm, 12px)",
                  background: "var(--rialto-surface-recessed)",
                  borderRadius: "var(--rialto-radius-default, 8px)",
                  border: isSelected
                    ? "2px solid var(--rialto-accent, #c49a2a)"
                    : "1px solid var(--rialto-border)",
                  cursor: "pointer",
                  textAlign: "center" as const,
                  position: "relative" as const,
                }}
              >
                {isRecommended && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: "var(--rialto-accent, #c49a2a)",
                      color: "var(--rialto-text-on-accent)",
                      fontSize: 9,
                      fontFamily: "var(--rialto-font-sans, system-ui)",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    Recommended
                  </span>
                )}
                <div
                  style={{
                    fontFamily: "var(--rialto-font-sans, system-ui)",
                    fontSize: "var(--rialto-text-xs, 11px)",
                    fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
                    color: "var(--rialto-text-primary)",
                    marginTop: 4,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--rialto-font-sans, system-ui)",
                    fontSize: 10,
                    color: "var(--rialto-text-tertiary)",
                  }}
                >
                  {count} tables
                </div>
              </button>
            );
          })}
        </div>

        {/* Size selector */}
        <h4
          style={{
            ...headingStyle,
            fontSize: "var(--rialto-text-sm, 13px)",
            margin: "0 0 var(--rialto-space-xs, 8px)",
          }}
        >
          Room Size
        </h4>
        <div style={sizeGridStyle}>
          {TEMPLATE_SIZES.map((s) => {
            const sizeId = s.label.toLowerCase();
            const isSelected = sizeId === selectedSize;
            return (
              <button
                key={sizeId}
                type="button"
                onClick={() => handleSizeClick(s.label)}
                aria-pressed={isSelected}
                style={{
                  padding: "var(--rialto-space-xs, 8px)",
                  background: "var(--rialto-surface-recessed)",
                  borderRadius: "var(--rialto-radius-sharp, 6px)",
                  border: isSelected
                    ? "2px solid var(--rialto-accent, #c49a2a)"
                    : "1px solid var(--rialto-border)",
                  textAlign: "center" as const,
                  cursor: "pointer",
                  fontFamily: "var(--rialto-font-sans, system-ui)",
                  fontSize: "var(--rialto-text-xs, 11px)",
                  fontWeight: (isSelected
                    ? "var(--rialto-weight-demi, 600)"
                    : "var(--rialto-weight-regular, 400)") as React.CSSProperties["fontWeight"],
                  color: isSelected
                    ? "var(--rialto-text-primary)"
                    : "var(--rialto-text-tertiary)",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel: read-only preview */}
      <div style={rightPanelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--rialto-space-sm, 12px)",
          }}
        >
          <div>
            <h3 style={{ ...headingStyle, margin: 0 }}>Preview</h3>
            <p
              style={{
                margin: "2px 0 0",
                fontFamily: "var(--rialto-font-sans, system-ui)",
                fontSize: "var(--rialto-text-xs, 11px)",
                color: "var(--rialto-text-tertiary)",
              }}
            >
              You can customize this later in the editor
            </p>
          </div>
          {preview && (
            <span style={summaryPillStyle}>
              {preview.tables.length} tables · {preview.sections.length} sections
            </span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {preview ? (
            <TemplateMiniPreview payload={preview} height={340} />
          ) : (
            <div
              style={{
                ...floorPlaceholderStyle,
                height: 340,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--rialto-font-sans, system-ui)",
                  fontSize: "var(--rialto-text-sm, 13px)",
                  color: "var(--rialto-text-tertiary)",
                }}
              >
                Select a template to preview
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const floorPlaceholderStyle: React.CSSProperties = {
  background: "var(--rialto-surface-recessed)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/client/features/onboarding/__tests__/StepFloorPlan.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/features/onboarding/components/StepFloorPlan.tsx src/client/features/onboarding/__tests__/StepFloorPlan.test.tsx
git commit -m "feat: add StepFloorPlan component with template picker and preview"
```

---

### Task 5: Wire StepFloorPlan into Onboarding page

**Files:**
- Modify: `src/client/pages/Onboarding.tsx`

- [ ] **Step 1: Add import**

Add after existing step imports:

```typescript
import { StepFloorPlan } from "../features/onboarding/components/StepFloorPlan";
```

- [ ] **Step 2: Update STEP_TITLES**

```typescript
const STEP_TITLES = [
  "What's your venue called?",
  "Where are you located?",
  "Add your logo",
  "Your brand",
  "Design your floor plan",
  "Welcome",
];
```

- [ ] **Step 3: Add setFloorPlan to destructured hook**

```typescript
// Change from:
const { state, next, back, setVenueInfo, setLocation, setLogoResult, setBrand, submitStart, submitSuccess, submitError } = useOnboarding();

// Change to:
const { state, next, back, setVenueInfo, setLocation, setLogoResult, setBrand, setFloorPlan, submitStart, submitSuccess, submitError } = useOnboarding();
```

- [ ] **Step 4: Update isLastStep**

```typescript
// Change from:
const isLastStep = currentStep === 5;

// Change to:
const isLastStep = currentStep === 6;
```

- [ ] **Step 5: Update canAdvance — add case 5**

```typescript
const canAdvance = (() => {
  switch (currentStep) {
    case 1:
      return Boolean(state.venueInfo?.name && state.venueInfo?.type && state.venueInfo?.cuisines?.length);
    case 2:
      return Boolean(state.location?.timezone);
    case 3:
      return true; // Logo is optional
    case 4:
      return Boolean(state.brand?.accent);
    case 5:
      return true; // Floor plan is optional
    default:
      return true;
  }
})();
```

- [ ] **Step 6: Update aria-label and step label**

```typescript
// Change "of 5" to "of 6":
<main id="main-content" style={pageStyle} data-theme="dark" aria-label={`Onboarding step ${currentStep} of 6: ${title}`}>

// Change:
<div style={stepLabelStyle}>Step {currentStep} of 5</div>
// To:
<div style={stepLabelStyle}>Step {currentStep} of 6</div>
```

- [ ] **Step 7: Add StepFloorPlan rendering + shift Welcome to step 6**

```typescript
{currentStep === 4 && (
  <StepBrand
    extractedColors={state.logoResult?.extractedColors ?? []}
    venueName={state.venueInfo?.name ?? ""}
    data={state.brand}
    onChange={setBrand}
  />
)}
{currentStep === 5 && (
  <StepFloorPlan
    data={state.floorPlan}
    onChange={setFloorPlan}
  />
)}
{currentStep === 6 && (
  <StepWelcome
    venueName={state.venueInfo?.name ?? "Your Venue"}
    accent={state.brand?.accent ?? "#c49a2a"}
    logoUrl={state.logoResult?.logoUrl ?? null}
    cuisines={state.venueInfo?.cuisines ?? []}
    isSubmitting={state.isSubmitting}
    onEnter={handleSubmit}
  />
)}
```

- [ ] **Step 8: Update button label for floor plan skip**

```typescript
// Change from:
{currentStep === 3 && !state.logoResult ? "Skip" : "Continue"}

// Change to:
{(currentStep === 3 && !state.logoResult) || (currentStep === 5 && !state.floorPlan) ? "Skip" : "Continue"}
```

- [ ] **Step 9: Include floorPlan in handleSubmit body**

```typescript
// Change from:
body: JSON.stringify({
  venueInfo,
  location,
  brand,
  logoUrl: logoResult?.logoUrl ?? null,
}),

// Change to:
body: JSON.stringify({
  venueInfo,
  location,
  brand,
  logoUrl: logoResult?.logoUrl ?? null,
  floorPlan: state.floorPlan ?? undefined,
}),
```

- [ ] **Step 10: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/client/pages/Onboarding.tsx
git commit -m "feat: wire floor plan step into onboarding flow"
```

---

### Task 6: Enhance StepWelcome with floor plan thumbnail

**Files:**
- Modify: `src/client/features/onboarding/components/StepWelcome.tsx`

- [ ] **Step 1: Add imports and update props**

```typescript
// Add import:
import { TemplateMiniPreview } from "./TemplateMiniPreview";
import { TEMPLATES, TEMPLATE_SIZES } from "@shared/templates/floor-plan";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

// Update props interface:
interface StepWelcomeProps {
  venueName: string;
  accent: string;
  logoUrl: string | null;
  cuisines: readonly string[];
  floorPlan: FloorPlanSelection | null;
  isSubmitting: boolean;
  onEnter: () => void;
}
```

- [ ] **Step 2: Add floor plan preview logic**

Inside the component function, after `cuisineLabel`:

```typescript
const floorPlanPreview = useMemo(() => {
  if (!floorPlan) return null;
  const template = TEMPLATES.find(
    (t) =>
      t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ===
      floorPlan.templateId,
  );
  const size = TEMPLATE_SIZES.find(
    (s) => s.label.toLowerCase() === floorPlan.size,
  );
  if (!template || !size) return null;
  return template.build(size.width, size.height);
}, [floorPlan]);
```

Add `useMemo` to imports from "react" at top of file.

- [ ] **Step 3: Update NAV_ITEMS to show checkmark**

```typescript
// Change from static constant to computed:
const navItems = [
  { label: "Dashboard", active: true },
  { label: "Reservations", active: false },
  { label: "Waitlist", active: false },
  { label: floorPlan ? "Floor Plan ✓" : "Floor Plan", active: false },
  { label: "Guests", active: false },
];
```

Move this inside the component (it now depends on `floorPlan` prop). Update the `.map()` to use `navItems` instead of `NAV_ITEMS`.

- [ ] **Step 4: Update main content area**

Replace the main content area with conditional floor plan thumbnail:

```typescript
{/* Main content area */}
<div style={mainStyle}>
  {floorPlanPreview ? (
    <>
      <div style={{ fontSize: "var(--rialto-text-xs, 11px)", color: "var(--rialto-text-tertiary)", fontFamily: "var(--rialto-font-sans, system-ui)" }}>
        Your floor plan
      </div>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <TemplateMiniPreview payload={floorPlanPreview} height={120} />
      </div>
      <div style={{ fontSize: 10, color: "var(--rialto-text-tertiary)", fontFamily: "var(--rialto-font-sans, system-ui)" }}>
        {floorPlanPreview.tables.length} tables · {floorPlanPreview.sections.length} sections
      </div>
    </>
  ) : (
    <>
      <h2 style={welcomeHeadingStyle}>Welcome to {venueName}</h2>
      <p style={welcomeSubtextStyle}>Your venue is ready.</p>
      <button type="button" tabIndex={-1} style={previewCTAStyle}>
        Get Started
      </button>
    </>
  )}
</div>
```

- [ ] **Step 5: Update StepWelcome call in Onboarding.tsx**

Pass the new `floorPlan` prop:

```typescript
{currentStep === 6 && (
  <StepWelcome
    venueName={state.venueInfo?.name ?? "Your Venue"}
    accent={state.brand?.accent ?? "#c49a2a"}
    logoUrl={state.logoResult?.logoUrl ?? null}
    cuisines={state.venueInfo?.cuisines ?? []}
    floorPlan={state.floorPlan}
    isSubmitting={state.isSubmitting}
    onEnter={handleSubmit}
  />
)}
```

- [ ] **Step 6: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/client/features/onboarding/components/StepWelcome.tsx src/client/pages/Onboarding.tsx
git commit -m "feat: add floor plan thumbnail to Welcome step"
```

---

### Task 7: Extend schema and server for floor plan creation

**Files:**
- Modify: `src/shared/schemas/venue.ts`
- Modify: `src/server/features/onboarding/service.ts`
- Modify: `src/server/features/onboarding/__tests__/service.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/server/features/onboarding/__tests__/service.test.ts`:

```typescript
// Add mock for floor plan repository (after existing mocks):
vi.mock("@server/features/floor-plans/repository", () => ({
  createFloorPlan: vi.fn(async () => ({
    id: "fp-1",
    tenant_id: "t-1",
    name: "Floor 1",
    sort_order: 1,
    canvas_width: 1200,
    canvas_height: 800,
    layout_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  saveFloorPlan: vi.fn(async () => {}),
}));

// Add import:
import { createFloorPlan, saveFloorPlan } from "@server/features/floor-plans/repository";

// Add test:
it("creates floor plan when floorPlan is provided", async () => {
  const db = mockDb();
  const inputWithFloorPlan = {
    ...validInput,
    floorPlan: {
      templateId: "fine-dining",
      size: "standard",
      tableCount: 16,
      seatCount: 64,
    },
  };

  await completeOnboarding(
    db,
    "user-1",
    "test@test.com",
    inputWithFloorPlan,
    "secret",
  );

  expect(createFloorPlan).toHaveBeenCalledWith(db, expect.any(String), "Floor 1");
  expect(saveFloorPlan).toHaveBeenCalledWith(
    db,
    expect.objectContaining({
      planId: "fp-1",
      canvasWidth: 1200,
      canvasHeight: 800,
    }),
  );
});

it("does not create floor plan when floorPlan is absent", async () => {
  const db = mockDb();

  await completeOnboarding(
    db,
    "user-1",
    "test@test.com",
    validInput,
    "secret",
  );

  expect(createFloorPlan).not.toHaveBeenCalled();
  expect(saveFloorPlan).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/server/features/onboarding/__tests__/service.test.ts`
Expected: FAIL — `floorPlan` property not valid on input, `createFloorPlan` not called

- [ ] **Step 3: Extend onboardingCompleteSchema**

In `src/shared/schemas/venue.ts`, add after existing schema:

```typescript
const floorPlanSelectionSchema = z.object({
  templateId: z.string().min(1),
  size: z.string().min(1),
  tableCount: z.number().int().min(1).optional(),
  seatCount: z.number().int().min(1).optional(),
});

export const onboardingCompleteSchema = z.object({
  venueInfo: venueInfoSchema,
  location: venueLocationSchema,
  brand: venueBrandSchema,
  logoUrl: z.string().nullable().default(null),
  floorPlan: floorPlanSelectionSchema.optional(),
});
```

- [ ] **Step 4: Update completeOnboarding service**

In `src/server/features/onboarding/service.ts`:

```typescript
// Add imports:
import { createFloorPlan, saveFloorPlan, type SaveFloorPlanData } from "@server/features/floor-plans/repository";
import { TEMPLATES, TEMPLATE_SIZES } from "@shared/templates/floor-plan";

// After the createVenueWithTheme() call and before the JWT section, add:
if (input.floorPlan) {
  // Resolve the tenant ID from the newly created venue
  const tenantRow = await db
    .prepare("SELECT id FROM tenants WHERE slug = ?")
    .bind(slug)
    .first<{ id: string }>();

  if (tenantRow) {
    const template = TEMPLATES.find(
      (t) =>
        t.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") === input.floorPlan!.templateId,
    );

    const size = TEMPLATE_SIZES.find(
      (s) => s.label.toLowerCase() === input.floorPlan!.size,
    );

    if (template && size) {
      const plan = await createFloorPlan(db, tenantRow.id, "Floor 1");
      const payload = template.build(size.width, size.height);

      const layoutData = {
        tables: payload.tables.map((t) => ({
          id: t.id, x: t.x, y: t.y,
          width: t.width, height: t.height, rotation: t.rotation,
        })),
        sections: payload.sections.map((s) => ({
          id: s.id, x: s.x, y: s.y, width: s.width, height: s.height,
        })),
        walls: payload.walls.map((w) => ({
          id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
          thickness: w.thickness,
          ...(w.wallType ? { wallType: w.wallType } : {}),
        })),
      };

      const saveData: SaveFloorPlanData = {
        planId: plan.id,
        tenantId: tenantRow.id,
        canvasWidth: size.width,
        canvasHeight: size.height,
        layoutDataJson: JSON.stringify(layoutData),
        tables: payload.tables.map((t) => ({
          id: t.id,
          label: t.label,
          shape: t.shape,
          minCapacity: t.minCapacity,
          maxCapacity: t.maxCapacity,
          sectionId: t.sectionId,
        })),
        sections: payload.sections.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
        })),
      };

      await saveFloorPlan(db, saveData);
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/server/features/onboarding/__tests__/service.test.ts`
Expected: PASS

Run: `pnpm build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/schemas/venue.ts src/server/features/onboarding/service.ts src/server/features/onboarding/__tests__/service.test.ts
git commit -m "feat: create floor plan during onboarding when template selected"
```

---

### Task 8: E2E tests

**Files:**
- Modify: `e2e/onboarding.spec.ts`

- [ ] **Step 1: Read existing E2E test to understand patterns**

Read: `e2e/onboarding.spec.ts`
Note the existing patterns for JWT cookie injection, page navigation, and assertions.

- [ ] **Step 2: Add floor plan step tests**

Add to the existing onboarding E2E test file:

```typescript
test("floor plan step — select template and continue", async ({ page }) => {
  // Navigate through steps 1-4 (reuse existing helpers or inline)
  // ... navigate to step 5 ...

  // Verify step 5 UI
  await expect(page.getByText("Step 5 of 6")).toBeVisible();
  await expect(page.getByText("Design your floor plan")).toBeVisible();
  await expect(page.getByText("Choose a Layout")).toBeVisible();

  // Enter table count
  await page.getByPlaceholder("e.g. 12").fill("16");

  // Select Fine Dining template
  await page.getByText("Fine Dining").click();

  // Verify preview renders
  await expect(page.getByRole("img", { name: /floor plan preview/i })).toBeVisible();

  // Click Continue
  await page.getByRole("button", { name: "Continue" }).click();

  // Verify we're on Welcome (step 6)
  await expect(page.getByText("Step 6 of 6")).toBeVisible();

  // Verify floor plan thumbnail in Welcome
  await expect(page.getByText("Your floor plan")).toBeVisible();
  await expect(page.getByText("Floor Plan ✓")).toBeVisible();
});

test("floor plan step — skip and continue", async ({ page }) => {
  // Navigate through steps 1-4
  // ... navigate to step 5 ...

  // Verify Skip button is present
  await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();

  // Click Skip
  await page.getByRole("button", { name: "Skip" }).click();

  // Verify we're on Welcome (step 6) without floor plan thumbnail
  await expect(page.getByText("Step 6 of 6")).toBeVisible();
  await expect(page.getByText("Your floor plan")).not.toBeVisible();
  await expect(page.getByText("Floor Plan ✓")).not.toBeVisible();
});

test("floor plan step — back navigation preserves selection", async ({ page }) => {
  // Navigate to step 5, select a template
  // ... select Fine Dining ...

  // Continue to step 6
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 6 of 6")).toBeVisible();

  // Go back to step 5
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Step 5 of 6")).toBeVisible();

  // Verify Fine Dining is still selected (has aria-pressed=true)
  const fineDiningBtn = page.getByText("Fine Dining").locator("..");
  await expect(fineDiningBtn).toHaveAttribute("aria-pressed", "true");
});
```

- [ ] **Step 3: Run E2E tests**

Run: `pnpm test:e2e`
Expected: PASS — all onboarding E2E tests green

- [ ] **Step 4: Commit**

```bash
git add e2e/onboarding.spec.ts
git commit -m "test: add E2E tests for floor plan onboarding step"
```
