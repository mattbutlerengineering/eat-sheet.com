# Mobile UI Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase text size, touch targets, and spacing across all screens for comfortable mobile use on Pixel phones.

**Architecture:** Global base font bump from 16px → 20px (25% increase), then targeted Tailwind class upgrades for elements that need extra attention. Slider thumb/track enlarged. Visual verification via Playwright screenshots at 412×915 (Pixel viewport).

**Tech Stack:** Tailwind v4 (CSS theme), React components, Playwright CLI for visual verification

---

### Task 1: Global Base Font & Slider Thumb

**Files:**
- Modify: `src/client/index.css:30-34` (html block)
- Modify: `src/client/index.css:94-124` (slider styles)

**Step 1: Set base font to 20px and enlarge slider**

In `src/client/index.css`, change the `html` block at line 30-34 to add `font-size: 20px;`:

```css
html {
  font-size: 20px;
  font-family: var(--font-body);
  background-color: var(--color-stone-950);
  color: var(--color-stone-50);
}
```

Change slider thumb from 28px → 36px and track from 6px → 8px. Update all four slider rules:

WebKit track (line 94-98):
```css
input[type="range"]::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 4px;
  background: var(--color-stone-700);
}
```

WebKit thumb (line 100-109):
```css
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-orange-500);
  margin-top: -14px;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
}
```

Moz track (line 111-115):
```css
input[type="range"]::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: var(--color-stone-700);
}
```

Moz thumb (line 117-124):
```css
input[type="range"]::-moz-range-thumb {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-orange-500);
  border: none;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
}
```

**Step 2: Visual verification**

```bash
playwright-cli resize 412 915
playwright-cli screenshot
```

Verify: text appears noticeably larger, slider thumb is bigger.

**Step 3: Commit**

```bash
git add src/client/index.css
git commit -m "feat: bump base font to 20px and enlarge slider thumb"
```

---

### Task 2: Restaurant List — Header & Sort Tabs

**Files:**
- Modify: `src/client/components/RestaurantList.tsx:45-94`

**Step 1: Enlarge header actions and sort tabs**

Line 46 — header padding: change `py-3` → `py-4`:
```tsx
<div className="px-4 py-4 flex items-center justify-between">
```

Line 51 — member name: change `text-sm text-stone-400` → `text-base text-stone-400`:
```tsx
<span className="text-base text-stone-400">{member.name}</span>
```

Line 55 — invite button: change `text-xs text-orange-500/70` → `text-sm text-orange-500/70`:
```tsx
className="text-sm text-orange-500/70 hover:text-orange-400 transition-colors"
```

Line 62 — leave button: change `text-xs text-stone-500` → `text-sm text-stone-500`:
```tsx
className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
```

Line 76 & 86 — sort tab buttons: change `px-3 py-1.5 text-xs` → `px-4 py-2 text-sm`:
```tsx
className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
```
(Apply to both sort buttons at line 76 and line 86)

**Step 2: Enlarge restaurant card content**

Line 124 — card padding: change `p-4` → `p-5`:
```tsx
<div className="bg-stone-900 border border-stone-800/50 rounded-xl p-5 active:scale-[0.98] transition-transform">
```

Line 139 — cuisine text: change `text-xs text-orange-500/80` → `text-sm text-orange-500/80`:
```tsx
<span className="text-sm text-orange-500/80 font-medium">
```

Line 143 — review count: change `text-xs text-stone-500` → `text-sm text-stone-500`:
```tsx
<span className="text-sm text-stone-500">
```

Line 116 — card list spacing: change `space-y-2` → `space-y-3`:
```tsx
<div className="space-y-3">
```

**Step 3: Commit**

```bash
git add src/client/components/RestaurantList.tsx
git commit -m "feat: enlarge header, sort tabs, and card content in restaurant list"
```

---

### Task 3: Restaurant Detail — Header, Scores & Delete Buttons

**Files:**
- Modify: `src/client/components/RestaurantDetail.tsx:92-290`

**Step 1: Enlarge back button**

Line 96 — back button: change `text-sm` → `text-base`:
```tsx
className="text-stone-400 hover:text-stone-200 transition-colors text-base"
```

**Step 2: Enlarge score context text**

Line 132 — score context: change `text-sm` → `text-base`:
```tsx
<span className="text-stone-500 text-base">
```

**Step 3: Enlarge cuisine & address**

Lines 119, 122 — change `text-sm` → `text-base`:
```tsx
<span className="text-base text-orange-500 font-medium">{restaurant.cuisine}</span>
```
```tsx
<span className="text-base text-stone-500">{restaurant.address}</span>
```

**Step 4: Enlarge Delete Restaurant button**

Line 160 — change `text-xs text-stone-500` → `text-sm text-stone-500 py-2`:
```tsx
className="text-sm text-stone-500 hover:text-red-400 transition-colors py-2"
```

**Step 5: Enlarge review card content**

Line 206 — review card padding: change `p-4` → `p-5`:
```tsx
className="bg-stone-900 border border-stone-800/50 rounded-xl p-5 animate-fade-up"
```

Line 213 — visit date: change `text-xs` → `text-sm`:
```tsx
<span className="text-stone-500 text-sm ml-2">
```

Lines 227, 232, 237, 242 — category scores: change `text-xs` → `text-sm`:
```tsx
<span className="text-sm text-stone-400">
```
(Apply to all four category score spans)

Line 251 — review notes: change `text-sm` → `text-base`:
```tsx
<p className="mt-3 text-base text-stone-300 leading-relaxed">{review.notes}</p>
```

Line 269 — review delete confirm: change `text-xs text-red-400` → `text-sm text-red-400 py-1`:
```tsx
className="text-sm text-red-400 font-medium py-1"
```

Line 275 — review delete cancel: change `text-xs text-stone-500` → `text-sm text-stone-500 py-1`:
```tsx
className="text-sm text-stone-500 py-1"
```

Line 283 — review delete trigger: change `text-xs text-stone-500` → `text-sm text-stone-500 py-1`:
```tsx
className="text-sm text-stone-500 hover:text-red-400 transition-colors py-1"
```

Line 197 — empty reviews text: change `text-sm` → `text-base`:
```tsx
<p className="text-stone-500 text-base py-4 text-center">
```

**Step 6: Commit**

```bash
git add src/client/components/RestaurantDetail.tsx
git commit -m "feat: enlarge text and touch targets on restaurant detail page"
```

---

### Task 4: Review Form & Score Slider Labels

**Files:**
- Modify: `src/client/components/ReviewForm.tsx:62-127`
- Modify: `src/client/components/ScoreSlider.tsx:54-101`

**Step 1: Enlarge ReviewForm labels**

Line 70 — breakdown label: change `text-xs` → `text-sm`:
```tsx
<p className="text-sm text-stone-500 uppercase tracking-wider mb-2">Breakdown (optional)</p>
```

Line 78 — visited label: change `text-xs` → `text-sm`:
```tsx
<label htmlFor="visit-date" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
```

Line 91 — notes label: change `text-xs` → `text-sm`:
```tsx
<label htmlFor="notes" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
```

Line 62 — form spacing: change `space-y-4` → `space-y-5`:
```tsx
<form onSubmit={handleSubmit} className="space-y-5">
```

**Step 2: Enlarge ScoreSlider inactive button**

Line 58 — inactive score button: change `text-sm text-stone-500` → `text-base text-stone-500` and `py-2` → `py-2.5`:
```tsx
className="flex items-center gap-2 text-base text-stone-500 hover:text-stone-300 py-2.5 transition-colors"
```

Line 60 — plus icon circle: change `w-5 h-5` → `w-6 h-6`:
```tsx
<span className="w-6 h-6 rounded-full border border-stone-600 flex items-center justify-center text-xs">+</span>
```

Line 79 — active slider label: change `text-sm` → `text-base`:
```tsx
<span className="text-base font-medium text-stone-300">{label}</span>
```

**Step 3: Commit**

```bash
git add src/client/components/ReviewForm.tsx src/client/components/ScoreSlider.tsx
git commit -m "feat: enlarge form labels and score slider controls"
```

---

### Task 5: AddRestaurant & JoinScreen Forms

**Files:**
- Modify: `src/client/components/AddRestaurant.tsx:43-53`
- Modify: `src/client/components/JoinScreen.tsx:36-91`

**Step 1: Enlarge AddRestaurant header & labels**

Line 47 — back button: change `text-sm` → `text-base`:
```tsx
className="text-stone-400 hover:text-stone-200 transition-colors text-base"
```

Lines 57, 72, 86 — all three labels: change `text-xs` → `text-sm`:
```tsx
<label htmlFor="r-name" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
```
```tsx
<label htmlFor="r-cuisine" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
```
```tsx
<label htmlFor="r-address" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
```

**Step 2: Enlarge JoinScreen labels & subtitle**

Line 36 — subtitle: change `text-sm` → `text-base`:
```tsx
<p className="mt-2 text-stone-400 font-body text-base tracking-widest uppercase">
```

Lines 48, 63 — form labels: change `text-xs` → `text-sm`:
```tsx
<label htmlFor="invite-code" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
```
```tsx
<label htmlFor="name" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
```

Line 91 — help text: change `text-xs` → `text-sm`:
```tsx
className="text-center text-stone-600 text-sm mt-8 animate-fade-up"
```

**Step 3: Commit**

```bash
git add src/client/components/AddRestaurant.tsx src/client/components/JoinScreen.tsx
git commit -m "feat: enlarge form labels on add restaurant and join screens"
```

---

### Task 6: InviteCodePanel Polish

**Files:**
- Modify: `src/client/components/InviteCodePanel.tsx:45-91`

**Step 1: Enlarge panel text**

Line 45 — close button: change `text-sm` → `text-base`:
```tsx
<button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-base">
```

Line 66 — share text: change `text-xs` → `text-sm`:
```tsx
<p className="text-sm text-stone-500 mb-4">
```

Line 88 — regen link: change `text-xs` → `text-sm`:
```tsx
className="w-full text-sm text-stone-500 hover:text-red-400 transition-colors py-2"
```

**Step 2: Commit**

```bash
git add src/client/components/InviteCodePanel.tsx
git commit -m "feat: enlarge invite code panel text"
```

---

### Task 7: Visual Verification with Playwright

**Step 1: Resize to Pixel viewport and take screenshots of all screens**

```bash
playwright-cli resize 412 915
playwright-cli open http://localhost:5173
playwright-cli screenshot  # Join screen
```

Fill form, join, then screenshot each page:
- Restaurant list (with cards)
- Restaurant detail (with review)
- Add restaurant form
- Review form (click Add Your Review)

**Step 2: Compare before/after**

Verify:
- All text is comfortably readable at arm's length
- Buttons and tap targets feel spacious
- No overflow or layout breakage
- Slider thumb is easy to grab
- Cards have comfortable padding

**Step 3: Final commit if any touch-ups needed**

```bash
git commit -m "fix: touch-up any visual issues from verification"
```
