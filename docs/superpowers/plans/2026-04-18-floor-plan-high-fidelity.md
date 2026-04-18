# Floor Plan High-Fidelity Rendering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace procedural Konva shape compositions with SVG furniture assets and tileable texture fills, reducing scene nodes ~5x while achieving higher visual fidelity.

**Architecture:** SVG assets for furniture (table, chair, booth, bar stool, place setting), PNG textures for floor/section materials, a `useTextures()` hook for preloading, and an optional `floorMaterial` field on sections with a DB migration.

**Tech Stack:** React-Konva (Image node), SVG, PNG tileable textures, Vite static imports, D1 migration

---

### Task 1: Create SVG furniture assets

**Files:**
- Create: `src/client/features/floor-plan/assets/table-round.svg`
- Create: `src/client/features/floor-plan/assets/table-square.svg`
- Create: `src/client/features/floor-plan/assets/table-rect.svg`
- Create: `src/client/features/floor-plan/assets/chair.svg`
- Create: `src/client/features/floor-plan/assets/bar-stool.svg`
- Create: `src/client/features/floor-plan/assets/booth.svg`
- Create: `src/client/features/floor-plan/assets/place-setting.svg`

All SVGs use the warm palette: `#8B7355` (wood base), `#7A6548` (wood dark), `#9C8468` (wood light/highlight), `#6B5740` (wood stroke), `#4a3f32` (chair frame), `#5c4f40` (chair cushion).

- [ ] **Step 1: Create table-round.svg**

```svg
<!-- src/client/features/floor-plan/assets/table-round.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- Contact shadow -->
  <circle cx="32" cy="34" r="30" fill="rgba(0,0,0,0.12)" />
  <!-- Table surface -->
  <circle cx="32" cy="32" r="28" fill="#8B7355" stroke="#6B5740" stroke-width="1" />
  <!-- Wood grain rings -->
  <circle cx="32" cy="32" r="22" fill="none" stroke="#806A4E" stroke-width="0.5" opacity="0.25" />
  <circle cx="32" cy="32" r="16" fill="none" stroke="#806A4E" stroke-width="0.5" opacity="0.2" />
  <circle cx="32" cy="32" r="10" fill="none" stroke="#806A4E" stroke-width="0.4" opacity="0.15" />
  <!-- Top-left highlight -->
  <circle cx="30" cy="30" r="25" fill="none" stroke="#9C8468" stroke-width="0.8" opacity="0.3" />
  <!-- Center dot (subtle) -->
  <circle cx="32" cy="32" r="2" fill="#7A6548" opacity="0.3" />
</svg>
```

- [ ] **Step 2: Create table-square.svg**

```svg
<!-- src/client/features/floor-plan/assets/table-square.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- Contact shadow -->
  <rect x="2" y="4" width="62" height="62" rx="4" fill="rgba(0,0,0,0.12)" />
  <!-- Table surface -->
  <rect x="2" y="2" width="60" height="60" rx="3" fill="#8B7355" stroke="#6B5740" stroke-width="1" />
  <!-- Wood grain lines -->
  <line x1="6" y1="12" x2="58" y2="12" stroke="#806A4E" stroke-width="0.5" opacity="0.3" />
  <line x1="6" y1="22" x2="58" y2="22" stroke="#806A4E" stroke-width="0.5" opacity="0.25" />
  <line x1="6" y1="32" x2="58" y2="32" stroke="#806A4E" stroke-width="0.5" opacity="0.3" />
  <line x1="6" y1="42" x2="58" y2="42" stroke="#806A4E" stroke-width="0.5" opacity="0.25" />
  <line x1="6" y1="52" x2="58" y2="52" stroke="#806A4E" stroke-width="0.5" opacity="0.3" />
  <!-- Top edge highlight -->
  <line x1="5" y1="3.5" x2="59" y2="3.5" stroke="#9C8468" stroke-width="1" opacity="0.35" />
  <!-- Left edge highlight -->
  <line x1="3.5" y1="5" x2="3.5" y2="59" stroke="#9C8468" stroke-width="0.5" opacity="0.2" />
</svg>
```

- [ ] **Step 3: Create table-rect.svg**

```svg
<!-- src/client/features/floor-plan/assets/table-rect.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 48" width="100" height="48">
  <!-- Contact shadow -->
  <rect x="1" y="3" width="100" height="48" rx="6" fill="rgba(0,0,0,0.12)" />
  <!-- Table surface -->
  <rect x="1" y="1" width="98" height="46" rx="6" fill="#8B7355" stroke="#6B5740" stroke-width="1" />
  <!-- Wood grain lines -->
  <line x1="8" y1="10" x2="92" y2="10" stroke="#806A4E" stroke-width="0.5" opacity="0.3" />
  <line x1="8" y1="18" x2="92" y2="18" stroke="#806A4E" stroke-width="0.5" opacity="0.25" />
  <line x1="8" y1="26" x2="92" y2="26" stroke="#806A4E" stroke-width="0.5" opacity="0.3" />
  <line x1="8" y1="34" x2="92" y2="34" stroke="#806A4E" stroke-width="0.5" opacity="0.25" />
  <line x1="8" y1="42" x2="92" y2="42" stroke="#806A4E" stroke-width="0.5" opacity="0.2" />
  <!-- Top edge highlight -->
  <line x1="8" y1="2.5" x2="92" y2="2.5" stroke="#9C8468" stroke-width="1" opacity="0.35" />
  <!-- Left edge highlight -->
  <line x1="2.5" y1="8" x2="2.5" y2="40" stroke="#9C8468" stroke-width="0.5" opacity="0.2" />
</svg>
```

- [ ] **Step 4: Create chair.svg**

```svg
<!-- src/client/features/floor-plan/assets/chair.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 10" width="12" height="10">
  <!-- Chair frame -->
  <rect x="0.5" y="0.5" width="11" height="9" rx="3" fill="#4a3f32" stroke="#3d3228" stroke-width="0.5" />
  <!-- Cushion -->
  <rect x="2.5" y="2.5" width="7" height="5" rx="2" fill="#5c4f40" />
</svg>
```

- [ ] **Step 5: Create bar-stool.svg**

```svg
<!-- src/client/features/floor-plan/assets/bar-stool.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <!-- Shadow -->
  <circle cx="16" cy="17" r="14" fill="rgba(0,0,0,0.1)" />
  <!-- Footrest ring -->
  <circle cx="16" cy="16" r="14" fill="none" stroke="#3d3228" stroke-width="1.5" />
  <!-- Seat -->
  <circle cx="16" cy="16" r="11" fill="#4a3f32" stroke="#3d3228" stroke-width="0.5" />
  <!-- Cushion -->
  <circle cx="16" cy="16" r="8" fill="#5c4f40" />
  <!-- Highlight -->
  <circle cx="14" cy="14" r="5" fill="none" stroke="#6b5e50" stroke-width="0.5" opacity="0.3" />
</svg>
```

- [ ] **Step 6: Create booth.svg**

```svg
<!-- src/client/features/floor-plan/assets/booth.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 24" width="100" height="24">
  <!-- Back frame -->
  <rect x="0" y="0" width="100" height="10" rx="3" fill="#4a3f32" stroke="#3d3228" stroke-width="0.5" />
  <!-- Seat cushion -->
  <rect x="2" y="10" width="96" height="12" rx="3" fill="#5c4f40" />
  <!-- Cushion detail — tufting lines -->
  <line x1="26" y1="12" x2="26" y2="20" stroke="#4a3f32" stroke-width="0.5" opacity="0.3" />
  <line x1="50" y1="12" x2="50" y2="20" stroke="#4a3f32" stroke-width="0.5" opacity="0.3" />
  <line x1="74" y1="12" x2="74" y2="20" stroke="#4a3f32" stroke-width="0.5" opacity="0.3" />
  <!-- Seat highlight -->
  <line x1="4" y1="11" x2="96" y2="11" stroke="#6b5e50" stroke-width="0.5" opacity="0.25" />
</svg>
```

- [ ] **Step 7: Create place-setting.svg**

```svg
<!-- src/client/features/floor-plan/assets/place-setting.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12">
  <!-- Plate outer ring -->
  <circle cx="6" cy="6" r="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)" stroke-width="0.5" />
  <!-- Plate inner ring -->
  <circle cx="6" cy="6" r="3" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.3" />
  <!-- Napkin fold (small triangle, left) -->
  <polygon points="0,3 0,9 2,6" fill="rgba(255,255,255,0.06)" />
</svg>
```

- [ ] **Step 8: Verify SVGs render correctly**

Run: `pnpm build`
Expected: PASS — Vite bundles SVGs as static assets

- [ ] **Step 9: Commit**

```bash
git add src/client/features/floor-plan/assets/
git commit -m "feat: add SVG furniture assets for high-fidelity floor plan rendering"
```

---

### Task 2: Create tileable texture PNGs

**Files:**
- Create: `src/client/features/floor-plan/textures/hardwood.png`
- Create: `src/client/features/floor-plan/textures/concrete.png`
- Create: `src/client/features/floor-plan/textures/carpet.png`
- Create: `src/client/features/floor-plan/textures/tile.png`
- Create: `src/client/features/floor-plan/textures/marble.png`

These are small (64x64px) tileable textures. Generate them programmatically using a canvas script, or create minimal procedural PNGs.

- [ ] **Step 1: Create a texture generation script**

Create a Node.js script at `scripts/generate-textures.ts` that generates all 5 textures as 64x64px PNGs using the `canvas` package (or use raw pixel data written with a PNG encoder). The script writes files to `src/client/features/floor-plan/textures/`.

Texture descriptions for the generator:
- **hardwood.png**: Warm brown horizontal lines (#d4cfc8 base, #c4b8a8 grain) — light wood planks
- **concrete.png**: Light gray with subtle noise (#d4cfc8 base, random darker speckles)
- **carpet.png**: Dense small dots pattern (#8a7d70 base) — low-pile carpet feel
- **tile.png**: Grid of light squares (#e8e2d8 base, #d4cfc8 grout lines at 16px intervals)
- **marble.png**: White/cream with subtle gray veins (#f0ece6 base, wispy #c0b8a8 lines)

Alternative approach: Create the PNGs using any image tool or even encode raw pixel data. The important thing is they're 64x64px, tileable (edges match), and match the warm palette.

- [ ] **Step 2: Generate the textures**

Run the generation script or create the files manually. Verify each is 64x64px.

- [ ] **Step 3: Verify textures are bundled**

Run: `pnpm build`
Expected: PASS — PNGs are included in the asset output

- [ ] **Step 4: Commit**

```bash
git add src/client/features/floor-plan/textures/
git commit -m "feat: add tileable texture PNGs for floor plan surfaces"
```

---

### Task 3: Create useTextures hook

**Files:**
- Create: `src/client/features/floor-plan/hooks/useTextures.ts`
- Test: `src/client/features/floor-plan/__tests__/useTextures.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/client/features/floor-plan/__tests__/useTextures.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTextures } from "../hooks/useTextures";

// Mock Image constructor
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

vi.stubGlobal("Image", MockImage);

describe("useTextures", () => {
  it("starts with loaded false", () => {
    const { result } = renderHook(() => useTextures());
    expect(result.current.loaded).toBe(false);
  });

  it("sets loaded to true after all images load", async () => {
    const { result } = renderHook(() => useTextures());

    // Wait for async image loads
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.loaded).toBe(true);
  });

  it("provides texture images by key", async () => {
    const { result } = renderHook(() => useTextures());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.textures["table-round"]).toBeDefined();
    expect(result.current.textures["chair"]).toBeDefined();
    expect(result.current.textures["hardwood"]).toBeDefined();
    expect(result.current.textures["concrete"]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/client/features/floor-plan/__tests__/useTextures.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useTextures hook**

```typescript
// src/client/features/floor-plan/hooks/useTextures.ts
import { useState, useEffect } from "react";

// SVG furniture assets
import tableRoundSrc from "../assets/table-round.svg";
import tableSquareSrc from "../assets/table-square.svg";
import tableRectSrc from "../assets/table-rect.svg";
import chairSrc from "../assets/chair.svg";
import barStoolSrc from "../assets/bar-stool.svg";
import boothSrc from "../assets/booth.svg";
import placeSettingSrc from "../assets/place-setting.svg";

// Texture PNGs
import hardwoodSrc from "../textures/hardwood.png";
import concreteSrc from "../textures/concrete.png";
import carpetSrc from "../textures/carpet.png";
import tileSrc from "../textures/tile.png";
import marbleSrc from "../textures/marble.png";

const ASSET_MAP: Record<string, string> = {
  "table-round": tableRoundSrc,
  "table-square": tableSquareSrc,
  "table-rect": tableRectSrc,
  "chair": chairSrc,
  "bar-stool": barStoolSrc,
  "booth": boothSrc,
  "place-setting": placeSettingSrc,
  "hardwood": hardwoodSrc,
  "concrete": concreteSrc,
  "carpet": carpetSrc,
  "tile": tileSrc,
  "marble": marbleSrc,
};

export interface TextureMap {
  readonly [key: string]: HTMLImageElement;
}

export interface UseTexturesResult {
  readonly loaded: boolean;
  readonly textures: TextureMap;
}

export function useTextures(): UseTexturesResult {
  const [loaded, setLoaded] = useState(false);
  const [textures, setTextures] = useState<TextureMap>({});

  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(ASSET_MAP);
    const images: Record<string, HTMLImageElement> = {};
    let count = 0;

    for (const [key, src] of entries) {
      const img = new Image();
      img.onload = () => {
        images[key] = img;
        count += 1;
        if (count === entries.length && !cancelled) {
          setTextures(images);
          setLoaded(true);
        }
      };
      img.onerror = () => {
        count += 1;
        if (count === entries.length && !cancelled) {
          setTextures(images);
          setLoaded(true);
        }
      };
      img.src = src;
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return { loaded, textures };
}
```

Note: Vite may need an SVG/PNG import declaration. If TypeScript complains about importing `.svg` or `.png`, add to `src/vite-env.d.ts`:

```typescript
declare module "*.svg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/client/features/floor-plan/__tests__/useTextures.test.ts`
Expected: PASS

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/client/features/floor-plan/hooks/useTextures.ts src/client/features/floor-plan/__tests__/useTextures.test.ts src/vite-env.d.ts
git commit -m "feat: add useTextures hook for preloading SVG and texture assets"
```

---

### Task 4: Replace TableShape with SVG Image rendering

**Files:**
- Modify: `src/client/features/floor-plan/components/TableShape.tsx`
- Modify: `src/client/features/floor-plan/components/FloorPlanCanvas.tsx` (pass textures prop)

This is the largest task — replace the multi-primitive table rendering with SVG `<Image>` nodes.

- [ ] **Step 1: Update FloorPlanCanvas to load and pass textures**

In `src/client/features/floor-plan/components/FloorPlanCanvas.tsx`, add the `useTextures` hook and pass textures to `TableShape`:

```typescript
// Add import:
import { useTextures } from "../hooks/useTextures";

// Inside FloorPlanCanvas component, add:
const { loaded: texturesLoaded, textures } = useTextures();

// Pass to each TableShape:
<TableShape
  key={table.id}
  table={table}
  isSelected={...}
  accentColor={...}
  textures={textures}
  onSelect={...}
  onDragEnd={...}
  onTransformEnd={...}
/>
```

- [ ] **Step 2: Rewrite TableShape.tsx**

Replace the entire `TableShape` component. Keep the same props interface (add `textures`) and all callback logic (`handleClick`, `handleDragEnd`, `handleTransformEnd`). Keep `getChairPositions()` and `getPlatePositions()` — only change the rendering.

```typescript
// src/client/features/floor-plan/components/TableShape.tsx
import { useRef, useCallback, useMemo } from "react";
import { Group, Image, Text, Rect, Circle } from "react-konva";
import type Konva from "konva";
import type { EditorTable } from "../types";
import type { TextureMap } from "../hooks/useTextures";

interface TableShapeProps {
  readonly table: EditorTable;
  readonly isSelected: boolean;
  readonly accentColor: string;
  readonly textures: TextureMap;
  readonly onSelect: (id: string) => void;
  readonly onDragEnd: (id: string, x: number, y: number) => void;
  readonly onTransformEnd: (
    id: string,
    width: number,
    height: number,
    rotation: number,
    x: number,
    y: number,
  ) => void;
}

// Keep CHAIR_W, CHAIR_H, CHAIR_GAP, PLATE_RADIUS, PLATE_OFFSET constants
// Keep getChairPositions() function exactly as-is
// Keep getPlatePositions() function exactly as-is

export function TableShape({
  table,
  isSelected,
  accentColor,
  textures,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: TableShapeProps) {
  // Keep all existing callback refs and handlers unchanged:
  // groupRef, handleClick, handleDragEnd, handleTransformEnd

  const chairPositions = getChairPositions(table.shape, table.width, table.height, table.maxCapacity);
  const platePositions = getPlatePositions(table.shape, table.width, table.height, table.maxCapacity);
  const labelFontSize = Math.max(10, Math.min(table.width, table.height) * 0.24);

  // Select the right SVG image for this table shape
  const tableImageKey = table.shape === "circle" ? "table-round"
    : table.shape === "square" ? "table-square"
    : "table-rect";
  const tableImage = textures[tableImageKey];
  const chairImage = textures["chair"];
  const plateImage = textures["place-setting"];

  return (
    <Group
      ref={groupRef}
      id={table.id}
      x={table.x}
      y={table.y}
      width={table.width}
      height={table.height}
      rotation={table.rotation}
      draggable
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* Contact shadow */}
      {table.shape === "circle" ? (
        <Circle
          x={table.width / 2}
          y={table.height / 2 + 2}
          radius={table.width / 2 + 3}
          fill="rgba(0,0,0,0.15)"
          listening={false}
        />
      ) : (
        <Rect
          x={-2}
          y={1}
          width={table.width + 4}
          height={table.height + 4}
          fill="rgba(0,0,0,0.15)"
          cornerRadius={table.shape === "square" ? 5 : 8}
          listening={false}
        />
      )}

      {/* Chairs — SVG images */}
      {chairImage && chairPositions.map((pos, i) => (
        <Image
          key={`chair-${i}`}
          image={chairImage}
          x={pos.x - 6}
          y={pos.y - 5}
          width={12}
          height={10}
          rotation={pos.rotation}
          offsetX={0}
          offsetY={0}
          listening={false}
        />
      ))}

      {/* Table surface — SVG image */}
      {tableImage && (
        <Image
          image={tableImage}
          x={0}
          y={0}
          width={table.width}
          height={table.height}
          shadowColor="#000000"
          shadowBlur={isSelected ? 14 : 8}
          shadowOffsetY={isSelected ? 4 : 2}
          shadowOpacity={isSelected ? 0.45 : 0.3}
          listening={false}
        />
      )}

      {/* Selection stroke overlay */}
      {isSelected && (
        table.shape === "circle" ? (
          <Circle
            x={table.width / 2}
            y={table.height / 2}
            radius={table.width / 2}
            fill="transparent"
            stroke={accentColor}
            strokeWidth={2}
            listening={false}
          />
        ) : (
          <Rect
            width={table.width}
            height={table.height}
            fill="transparent"
            stroke={accentColor}
            strokeWidth={2}
            cornerRadius={table.shape === "square" ? 3 : 6}
            listening={false}
          />
        )
      )}

      {/* Place settings — SVG images */}
      {plateImage && platePositions.map((pos, i) => (
        <Image
          key={`plate-${i}`}
          image={plateImage}
          x={pos.x - 6}
          y={pos.y - 6}
          width={12}
          height={12}
          listening={false}
        />
      ))}

      {/* Label */}
      <Text
        text={table.label}
        x={0}
        y={0}
        width={table.width}
        height={table.height}
        align="center"
        verticalAlign="middle"
        fontSize={labelFontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontStyle="700"
        fill="#d4cfc8"
        opacity={isSelected ? 1 : 0.8}
        listening={false}
      />
    </Group>
  );
}
```

Important: keep ALL the original helper functions (`getChairPositions`, `getPlatePositions`) and constants (`CHAIR_W`, `CHAIR_H`, etc.) — the positioning math doesn't change, only the primitives that render at those positions.

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Run existing tests**

Run: `pnpm test`
Expected: PASS — existing floor plan tests don't test visual rendering, only state/data

- [ ] **Step 5: Commit**

```bash
git add src/client/features/floor-plan/components/TableShape.tsx src/client/features/floor-plan/components/FloorPlanCanvas.tsx
git commit -m "feat: replace procedural table rendering with SVG Image nodes"
```

---

### Task 5: Replace CanvasGrid speckles with texture fill

**Files:**
- Modify: `src/client/features/floor-plan/components/CanvasGrid.tsx`
- Modify: `src/client/features/floor-plan/components/FloorPlanCanvas.tsx` (pass textures)

- [ ] **Step 1: Update FloorPlanCanvas to pass textures to CanvasGrid**

```typescript
// In FloorPlanCanvas, update the CanvasGrid rendering:
<CanvasGrid
  width={canvasWidth}
  height={canvasHeight}
  floorTexture={textures["hardwood"]}
/>
```

- [ ] **Step 2: Rewrite CanvasGrid.tsx**

Replace speckle generation with a texture fill. Remove `seededRandom` function and speckles memo entirely.

```typescript
// src/client/features/floor-plan/components/CanvasGrid.tsx
import { Rect, Circle, Image } from "react-konva";
import { useMemo } from "react";

interface CanvasGridProps {
  readonly width: number;
  readonly height: number;
  readonly spacing?: number | undefined;
  readonly floorTexture?: HTMLImageElement | undefined;
}

export function CanvasGrid({ width, height, spacing = 40, floorTexture }: CanvasGridProps) {
  const dots = useMemo(() => {
    const d: React.ReactNode[] = [];
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        d.push(
          <Circle
            key={`${x}-${y}`}
            x={x}
            y={y}
            radius={1}
            fill="rgba(0,0,0,0.06)"
            listening={false}
          />,
        );
      }
    }
    return d;
  }, [width, height, spacing]);

  return (
    <>
      {/* Floor surface with texture */}
      {floorTexture ? (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fillPatternImage={floorTexture}
          fillPatternRepeat="repeat"
          stroke="#b8b2a8"
          strokeWidth={2}
          cornerRadius={2}
          shadowColor="#000000"
          shadowBlur={24}
          shadowOffsetY={0}
          shadowOpacity={0.4}
          listening={false}
        />
      ) : (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="#d4cfc8"
          stroke="#b8b2a8"
          strokeWidth={2}
          cornerRadius={2}
          shadowColor="#000000"
          shadowBlur={24}
          shadowOffsetY={0}
          shadowOpacity={0.4}
          listening={false}
        />
      )}
      {/* Inner edge highlight */}
      <Rect
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
        fill="transparent"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        cornerRadius={1}
        listening={false}
      />
      {/* Grid dots (speckles removed — texture handles floor detail) */}
      {dots}
    </>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/features/floor-plan/components/CanvasGrid.tsx src/client/features/floor-plan/components/FloorPlanCanvas.tsx
git commit -m "feat: replace procedural floor speckles with tileable texture fill"
```

---

### Task 6: Add floorMaterial to section data model

**Files:**
- Create: `src/server/db/migrations/003_section_floor_material.sql`
- Modify: `src/shared/types/floor-plan.ts`
- Modify: `src/shared/schemas/floor-plan.ts`

- [ ] **Step 1: Create migration**

```sql
-- src/server/db/migrations/003_section_floor_material.sql
ALTER TABLE floor_plan_sections ADD COLUMN floor_material TEXT;
```

- [ ] **Step 2: Add floorMaterial to shared types**

In `src/shared/types/floor-plan.ts`, add to `FloorPlanSection`:

```typescript
export interface FloorPlanSection {
  readonly id: string;
  readonly floorPlanId: string;
  readonly name: string;
  readonly color: string;
  readonly floorMaterial?: "hardwood" | "concrete" | "carpet" | "tile" | "marble" | undefined;
}
```

Add to `SaveSectionPayload`:

```typescript
export interface SaveSectionPayload {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly floorMaterial?: "hardwood" | "concrete" | "carpet" | "tile" | "marble" | undefined;
}
```

- [ ] **Step 3: Add floorMaterial to Zod schema**

In `src/shared/schemas/floor-plan.ts`, add to `saveSectionSchema`:

```typescript
const floorMaterialSchema = z.enum(["hardwood", "concrete", "carpet", "tile", "marble"]).optional();

// Add to saveSectionSchema:
floorMaterial: floorMaterialSchema,
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: PASS

Run: `pnpm test`
Expected: PASS — existing tests don't set floorMaterial, which is optional

- [ ] **Step 5: Commit**

```bash
git add src/server/db/migrations/003_section_floor_material.sql src/shared/types/floor-plan.ts src/shared/schemas/floor-plan.ts
git commit -m "feat: add floorMaterial field to section data model"
```

---

### Task 7: Enhance SectionZone rendering with texture fill

**Files:**
- Modify: `src/client/features/floor-plan/components/SectionZone.tsx`
- Modify: `src/client/features/floor-plan/components/FloorPlanCanvas.tsx` (pass textures to SectionZone)

- [ ] **Step 1: Update FloorPlanCanvas to pass textures to SectionZone**

```typescript
<SectionZone
  key={section.id}
  section={section}
  isSelected={...}
  textures={textures}
  onSelect={...}
  onDragEnd={...}
  onTransformEnd={...}
/>
```

- [ ] **Step 2: Update SectionZone.tsx**

```typescript
// src/client/features/floor-plan/components/SectionZone.tsx
import { useCallback, useRef } from "react";
import { Group, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import type { EditorSection } from "../types";
import type { TextureMap } from "../hooks/useTextures";

interface SectionZoneProps {
  readonly section: EditorSection;
  readonly isSelected: boolean;
  readonly textures: TextureMap;
  readonly onSelect: (id: string) => void;
  readonly onDragEnd: (id: string, x: number, y: number) => void;
  readonly onTransformEnd: (id: string, width: number, height: number, x: number, y: number) => void;
}

export function SectionZone({
  section,
  isSelected,
  textures,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: SectionZoneProps) {
  // Keep all existing callback handlers unchanged

  const floorTexture = section.floorMaterial ? textures[section.floorMaterial] : undefined;

  return (
    <Group
      ref={groupRef}
      id={section.id}
      x={section.x}
      y={section.y}
      width={section.width}
      height={section.height}
      draggable
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* Section area fill — texture or color wash */}
      <Rect
        width={section.width}
        height={section.height}
        fill={floorTexture ? undefined : `${section.color}15`}
        fillPatternImage={floorTexture}
        fillPatternRepeat={floorTexture ? "repeat" : undefined}
        opacity={floorTexture ? 0.2 : 1}
        stroke={isSelected ? section.color : `${section.color}88`}
        strokeWidth={isSelected ? 2 : 1.5}
        cornerRadius={4}
      />

      {/* Color overlay when texture is used — blends section color with texture */}
      {floorTexture && (
        <Rect
          width={section.width}
          height={section.height}
          fill={`${section.color}15`}
          cornerRadius={4}
          listening={false}
        />
      )}

      {/* Inner shadow — top and left edges */}
      <Line
        points={[4, 2, section.width - 4, 2]}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={1}
        listening={false}
      />
      <Line
        points={[2, 4, 2, section.height - 4]}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={1}
        listening={false}
      />

      {/* Label with background pill + shadow */}
      <Rect
        x={8}
        y={6}
        width={section.name.length * 7.5 + 16}
        height={20}
        fill={`${section.color}25`}
        cornerRadius={3}
        shadowColor="#000000"
        shadowBlur={4}
        shadowOffsetY={1}
        shadowOpacity={0.15}
        listening={false}
      />
      <Text
        text={section.name.toUpperCase()}
        x={16}
        y={9}
        fontSize={11}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontStyle="600"
        fill={isSelected ? section.color : `${section.color}cc`}
        letterSpacing={1.2}
        listening={false}
      />
    </Group>
  );
}
```

Key changes from the existing SectionZone:
- Dashed stroke removed (solid border instead)
- `fillPatternImage` when `floorMaterial` is set
- Inner shadow lines (top + left edges)
- Label pill: `shadowBlur: 4`, font bumped to 11px, pill slightly taller (20px)
- `textures` prop added

- [ ] **Step 3: Add floorMaterial to EditorSection type**

In `src/client/features/floor-plan/types.ts`, `EditorSection` extends `FloorPlanSection` which now has `floorMaterial`. Verify no type errors.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: PASS

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/features/floor-plan/components/SectionZone.tsx src/client/features/floor-plan/components/FloorPlanCanvas.tsx
git commit -m "feat: enhance section rendering with texture fills and inner shadows"
```

---

### Task 8: Apply migration and verify end-to-end

**Files:** None new — verification task

- [ ] **Step 1: Apply migration locally**

```bash
npx wrangler d1 execute eat-sheet-db --local --file=src/server/db/migrations/003_section_floor_material.sql
```

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS

- [ ] **Step 3: Run full build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Start dev server and verify visually**

Run: `pnpm dev` (terminal 1) + `npx wrangler dev --port 8788` (terminal 2)

Open http://localhost:5173, navigate to Floor Plan editor:
- Verify tables render with SVG assets (wood grain, proper shape)
- Verify chairs render as SVG images around table perimeter
- Verify floor has hardwood texture fill (not solid color)
- Verify sections show solid border (not dashed) with label shadow
- Verify drag/select/transform still work
- Verify zoom/pan still work
- Verify template creation produces correctly rendered furniture

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address visual verification feedback"
```
