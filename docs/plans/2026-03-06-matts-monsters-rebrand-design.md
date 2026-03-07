# Matt's Monsters Visual Rebrand — Design

**Issue:** #50
**Date:** 2026-03-06

## Overview

Replace the Slurms SVG mascot with Matt's Monsters — characters extracted from Molly's acrylic painting. Update color palette to match the painting's warm tones. Rename mascot to "Chomps."

## Monster Assets

4 extracted PNGs in `public/monsters/`, each with full-res and 256px variants:

| File | Character | Visual |
|------|-----------|--------|
| `teal-big` | Hero "Chomps" — large teal body, orange belly, toothy grin, claws | Energetic, celebratory |
| `blue-bottom-right` | Blue round monster, side profile, mouth open | Friendly, greeting |
| `coral-left` | Coral/orange blob, subdued expression | Mellow, low-energy |
| `tiny-red-top-left` | Small red monster, blocky teeth, antenna | Snarky, attitude |

## Component: Monster.tsx (replaces Slurms.tsx)

### Variant Mapping

| Variant | Monster | Rationale |
|---------|---------|-----------|
| `party` | teal-big | Hero monster, big energy |
| `celebrate` | teal-big | Same hero for wins/perfect scores |
| `welcome` | blue-bottom-right | Open mouth = greeting |
| `bored` | coral-left | Subdued expression = meh |
| `sleeping` | coral-left | Same subdued monster |
| `snarky` | tiny-red-top-left | Blocky teeth grimace = error/attitude |

### Props Interface

Same as Slurms: `variant`, `size` (default 48), `className`. Renders `<img>` tag loading the 256px PNG variant.

## Color Palette (Accent Swap)

Keep dark `stone-950` background. Add painting-derived colors:

| Token | Hex | Purpose |
|-------|-----|---------|
| `--color-coral-500` | `#E8836E` | Primary accent (replaces orange-500 in buttons, headers) |
| `--color-teal-accent` | `#3BA8A0` | Secondary accent |
| `--color-golden` | `#D4A24E` | Highlight/glow effects |

Update key UI touchpoints:
- Buttons: `bg-orange-500` → `bg-coral-500`
- Headers: `text-orange-500` → `text-coral-500`
- Focus ring: `orange-500` → `coral-500`
- Glow effects: update rgba values to coral
- Theme color meta tag: `#f97316` → `#E8836E`
- Slider thumb + track accents

Retain `orange-500` definition in theme for any non-critical uses.

## Personality Text Update

In `src/client/utils/personality.ts`:
- "Slurms" → "Chomps" (all ~20 references)
- "worm" references → "monster" (e.g., "worm of approval" → "monster of approval")
- Comment headers updated to reference Chomps

In `src/client/components/ErrorBoundary.tsx`:
- "Something went wrong. Slurms is embarrassed." → "Something went wrong. Chomps is embarrassed."

## Component Migration (18 files)

Mechanical update in all files importing Slurms:
- `import { Slurms }` → `import { Monster }`
- `<Slurms variant=...>` → `<Monster variant=...>`
- Comments referencing Slurms updated

Files: App.tsx, ErrorBoundary.tsx, OnboardingFlow.tsx, SharePage.tsx, JoinScreen.tsx, ImportRestaurants.tsx, TonightFlow.tsx, ActivityFeed.tsx, GroupsPage.tsx, InstallPrompt.tsx, FamilyStats.tsx, InviteHandler.tsx, RandomPicker.tsx, RestaurantList.tsx, SizzleFlow.tsx, ProfilePage.tsx, TonightModeSelect.tsx, RestaurantDetail.tsx

## PWA Icons

- Source: `teal-big.png` (Chomps)
- Generate: `favicon.png` (32x32), `apple-touch-icon.png` (180x180), `icon-192.png`, `icon-512.png`
- Create `public/manifest.json` with icon references, theme_color `#E8836E`
- Update `index.html`: link manifest, update theme-color meta

## Out of Scope (Future)

- Monster avatars for members
- Score-based monster expressions
- Background paint wash texture
- Full painting as onboarding welcome screen
