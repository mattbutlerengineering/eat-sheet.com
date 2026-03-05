# Cuisine Dropdown Design

## Problem

Free-form cuisine input leads to typos ("Itslusn"), inconsistency ("American?", "Bar and grill"), and dirty filter chips on the restaurant list.

## Solution

Replace the text input with a strict `<select>` dropdown from a predefined cuisine list.

## Cuisine List

```
American, Asian Fusion, Barbecue, Brazilian, Chinese, French, Greek,
Indian, Italian, Japanese, Korean, Mediterranean, Mexican, Middle Eastern,
Pizza, Seafood, Southern, Thai, Vietnamese, Other
```

Stored as a `CUISINES` constant in `src/client/utils/cuisines.ts` for reuse.

## Component Changes

- **AddRestaurant.tsx**: Replace `<input>` with `<select>`, first option is empty placeholder ("Select cuisine..."), cuisine remains optional
- **Styling**: Match existing form inputs (stone-800 bg, rounded-xl, orange focus ring)

## Data Cleanup (Done)

- "American?" → "American"
- "Itslusn" → "Italian"
- "Bar and grill" → "American"
- All restaurants geocoded with full street addresses

## Approach

Native `<select>` — zero dependencies, accessible by default, great mobile UX with native picker.
