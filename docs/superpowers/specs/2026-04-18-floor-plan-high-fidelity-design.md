# Floor Plan Editor High-Fidelity Rendering

Upgrade the floor plan editor's visual fidelity by replacing procedural Konva shape compositions with SVG furniture assets, adding tileable texture fills for floors and sections, and enhancing section rendering.

## Context

The current editor renders tables as ~15-20 Konva primitives each (rect + grain lines + chairs + cushions + plates + shadows). This works but limits visual quality and creates performance overhead on large plans (~500 nodes for 30 tables). SVG assets rendered as Konva `Image` nodes achieve higher fidelity with fewer scene nodes.

## SVG Furniture Assets

Create top-down SVG furniture assets at `src/client/features/floor-plan/assets/`:

| Asset | File | Description |
|-------|------|-------------|
| Round table | `table-round.svg` | Wood-tone circle with grain pattern, beveled edge, shadow ring |
| Square table | `table-square.svg` | Wood-tone square with grain, rounded corners, edge highlight |
| Rectangular table | `table-rect.svg` | Wood-tone rectangle with grain lines, beveled edges |
| Chair | `chair.svg` | Top-down chair with frame, cushion, subtle shadow |
| Bar stool | `bar-stool.svg` | Small round seat with footrest ring |
| Booth seat | `booth.svg` | Curved/straight booth back with cushion |
| Place setting | `place-setting.svg` | Plate circle + napkin + silverware outline |

All SVGs use the existing warm palette: `#8B7355` (wood base), `#4a3f32` (dark brown chairs), `#9C8468` (light highlight), `#6B5740` (wood stroke).

### TableShape.tsx Changes

Replace multi-primitive rendering with:
- One Konva `<Image>` per table (loaded from SVG matching table shape)
- One Konva `<Image>` per chair (positioned around perimeter, rotated to face inward)
- One Konva `<Text>` for label (stays as Konva node on top)
- One optional stroke Rect/Circle for selection highlight

Chair positioning logic and rotation math stays — only the visual primitive changes.

**Performance:** ~15-20 Konva nodes per table → 2-3 nodes. A 30-table plan drops from ~500 to ~90 scene nodes.

## Tileable Texture Fills

Bundle small tileable texture PNGs at `src/client/features/floor-plan/textures/`:

| Texture | File | Used for | Size |
|---------|------|----------|------|
| Hardwood | `hardwood.png` | Default floor surface | 64x64px |
| Concrete | `concrete.png` | Alternative floor | 64x64px |
| Carpet | `carpet.png` | Section fill (lounge areas) | 64x64px |
| Tile | `tile.png` | Section fill (kitchen, bathroom) | 64x64px |
| Marble | `marble.png` | Section fill (upscale areas) | 64x64px |

Total bundle addition: ~20-30KB.

### CanvasGrid.tsx Changes

Replace solid `#d4cfc8` floor Rect + procedural speckle Circles (~50+ nodes) with a single Rect using `fillPatternImage` from the hardwood texture. Keep grid dots and edge highlight. Net reduction: ~50 nodes removed.

### Loading Strategy

`useTextures()` hook preloads all texture PNGs and SVG furniture assets via `new Image()` on canvas mount. Cached in state — loaded once, reused across all shapes. Returns `{ loaded: boolean, textures: Record<string, HTMLImageElement> }`.

## Enhanced Section Rendering

Sections currently have the lowest fidelity (dashed outline + color wash). Upgrades:

- **Floor material texture** blended with section color at ~20% opacity via `fillPatternImage`
- **Solid border** replaces dashed stroke — 1.5px in section color, cleaner look
- **Label upgrade:** Pill background gets `shadowBlur: 4, shadowOpacity: 0.15`, font 11px
- **Inner shadow:** `Line` along top and left edges at `rgba(0,0,0,0.06)` for recessed feel

No new Konva nodes added — texture uses `fillPatternImage` on existing Rect, dashed stroke becomes solid.

## Data Model

### Section Floor Material

Add optional `floorMaterial` field to sections:

- `SaveSectionPayload` gains `floorMaterial?: "hardwood" | "concrete" | "carpet" | "tile" | "marble" | undefined`
- `FloorPlanSection` gains same field
- `saveSectionSchema` gains `floorMaterial: z.enum(["hardwood", "concrete", "carpet", "tile", "marble"]).optional()`
- Migration `003_section_floor_material.sql`: `ALTER TABLE floor_plan_sections ADD COLUMN floor_material TEXT`

### Backward Compatibility

- Existing sections have `floor_material = NULL` → renders as current color wash (no texture)
- No data migration needed, just column add
- Templates can optionally set `floorMaterial` in a future update

## Files

### Create
| File | Purpose |
|------|---------|
| `src/client/features/floor-plan/assets/table-round.svg` | Round table SVG |
| `src/client/features/floor-plan/assets/table-square.svg` | Square table SVG |
| `src/client/features/floor-plan/assets/table-rect.svg` | Rectangular table SVG |
| `src/client/features/floor-plan/assets/chair.svg` | Chair SVG |
| `src/client/features/floor-plan/assets/bar-stool.svg` | Bar stool SVG |
| `src/client/features/floor-plan/assets/booth.svg` | Booth seat SVG |
| `src/client/features/floor-plan/assets/place-setting.svg` | Place setting SVG |
| `src/client/features/floor-plan/textures/hardwood.png` | Hardwood floor texture |
| `src/client/features/floor-plan/textures/concrete.png` | Concrete floor texture |
| `src/client/features/floor-plan/textures/carpet.png` | Carpet texture |
| `src/client/features/floor-plan/textures/tile.png` | Tile texture |
| `src/client/features/floor-plan/textures/marble.png` | Marble texture |
| `src/client/features/floor-plan/hooks/useTextures.ts` | Image preload hook |
| `src/server/db/migrations/003_section_floor_material.sql` | Add floor_material column |

### Modify
| File | Change |
|------|--------|
| `src/client/features/floor-plan/components/TableShape.tsx` | Replace multi-primitive with SVG Image nodes |
| `src/client/features/floor-plan/components/SectionZone.tsx` | Add texture fill, solid border, label shadow, inner shadow |
| `src/client/features/floor-plan/components/CanvasGrid.tsx` | Replace speckle with texture fillPatternImage |
| `src/shared/types/floor-plan.ts` | Add `floorMaterial` to section types |
| `src/shared/schemas/floor-plan.ts` | Add `floorMaterial` to section schema |

### No Changes
- `WallShape.tsx` — already medium-high fidelity with 3D isometric rendering
- Templates, repository, service, routes — no structural changes

## Testing

- Unit test for `useTextures` hook: loads images, returns loaded state, handles errors
- Existing floor plan tests pass unchanged (backward compatible)
- Visual verification via dev server
- Build verification: SVGs and PNGs correctly bundled by Vite

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Asset approach | Programmatic SVGs | Control over palette, match existing aesthetic |
| vs procedural upgrades | Asset-based wins | Higher fidelity ceiling + better performance |
| Texture storage | Bundled static imports | ~30KB, instant load, no network dependency |
| Loading | useTextures() hook | Preload once on mount, cache in state |
| Section material | Optional field, backward compatible | No existing data migration needed |
| Walls | No changes | Already high fidelity |
| Performance impact | ~500 → ~90 nodes (30 tables) | 5-6x reduction in Konva scene graph |
