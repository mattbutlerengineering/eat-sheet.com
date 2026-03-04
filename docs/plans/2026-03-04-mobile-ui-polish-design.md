# Mobile UI Polish Design

**Date:** 2026-03-04
**Goal:** Increase tap target sizes, text readability, and overall polish for mobile (Pixel phone, 412x915 viewport). Sizing + visual hierarchy improvements across all screens.

## Approach: Global Scale Bump + Targeted Polish

Increase the base font size globally so all rem-based Tailwind utilities scale up, then make targeted adjustments to specific elements that need extra attention.

## Changes

### 1. Global Base Font: 16px → 20px

Set `html { font-size: 20px }` in `index.css`. This gives a 25% proportional increase to all rem-based values (text, padding, margins, widths). On a Pixel phone (412 CSS px wide), `max-w-lg` (32rem = 640px) still exceeds viewport, so the app fills the screen with no layout breakage.

### 2. Targeted Text Size Bumps

| Element | Current | New |
|---------|---------|-----|
| Header actions ("Matt", "Invite", "Leave") | `text-xs` / `text-sm` | `text-sm` / `text-base` |
| Card metadata ("Italian", "1 review") | `text-sm` | `text-base` |
| "Delete Restaurant" / "Delete" review | `text-xs text-stone-500` | `text-sm` with min 44px tap target |
| "← Back" | `text-sm` | `text-base` |
| Form section labels ("NAME *", "CUISINE") | `text-xs` | `text-sm` |
| Score context ("/ 10 from 1 review") | `text-sm` | `text-base` |
| Sort tabs ("Recent", "Top Rated") | `text-sm` | `text-base` |

### 3. Touch Target Improvements

- Score slider thumb: 28px → 36px, track: 6px → 8px
- Breakdown buttons (+Food, +Service, etc.): add `py-2.5 px-4` padding
- Delete links: wrap in button with min 44px height
- Sort tab pills: increase padding for comfortable tapping

### 4. Spacing Polish

- Restaurant cards: `p-4` → `p-5`
- Review cards: `p-4` → `p-5`
- Header: `py-3` → `py-4`
- Form field vertical gaps: `space-y-4` → `space-y-5`

### 5. Visual Hierarchy

- Score badge on list cards: slightly larger with bolder presence
- "Delete Restaurant" — styled as clear destructive action, not ghost text
- Review card author/date — clearer visual separation

## Files to Modify

1. `src/client/index.css` — base font size, slider thumb size
2. `src/client/components/RestaurantList.tsx` — header, cards, sort tabs
3. `src/client/components/RestaurantDetail.tsx` — detail layout, delete button, review cards
4. `src/client/components/ReviewForm.tsx` — form spacing, breakdown buttons
5. `src/client/components/ScoreSlider.tsx` — slider thumb/track sizes
6. `src/client/components/AddRestaurant.tsx` — form label sizes
7. `src/client/components/JoinScreen.tsx` — form label sizes
8. `src/client/components/InviteCodePanel.tsx` — panel text sizes

## Non-Goals

- No color scheme changes (keep dark + orange theme)
- No layout restructuring (keep existing component hierarchy)
- No new components or features
