---
name: rialto-migrate
description: Migrate a raw <input>, <select>, or <textarea> in src/client to its Rialto equivalent. Drops hand-rolled inputStyle/labelStyle/focus state in favour of Rialto's built-in label, focus ring, and dark-theme tokens. Use when the ESLint `no-restricted-syntax` rule fires or when paying down a `TODO(rialto):` marker.
disable-model-invocation: true
---

# Rialto Migrate

Convert one raw HTML form element under `src/client/**` to the corresponding Rialto component.

The codebase enforces this with `eslint.config.js` (`no-restricted-syntax` rule). Running `pnpm lint` will identify the file + line. The five legitimate exceptions today are color pickers, hidden file inputs, decorative readonly previews, and inline tab-rename chrome — those keep an `// eslint-disable-next-line no-restricted-syntax -- <reason>` comment with a permanent reason. Everything else migrates.

## Mapping

| Old | New | Notes |
|---|---|---|
| `<input type="text">` | `Input` | `label="…"` replaces separate `<label>`. Drop manual `inputStyle`. |
| `<input type="number">` | `NumberInput` | onChange becomes `(value: number) => void` — refactor handlers to drop `parseInt` + `isNaN` + bounds checks (NumberInput clamps via `min`/`max`). Use `size="small"` for compact panels (~240px wide). |
| `<select>` | `Select` | Pass `label` prop. `onChange: (val: string) => void`. Without `label` the combobox has no accessible name. |
| `<textarea>` | `TextArea` | Same shape as Input. |

## Steps

1. Run `pnpm lint` to confirm the violation and grab the file/line.
2. Add the import: `import { Input, NumberInput } from "@mattbutlerengineering/rialto";`
3. Replace the JSX:
   - Move the `label="…"` text from the surrounding `<label>` element onto the Rialto component itself.
   - Delete the surrounding `<label>` and the `<div>` wrapper unless other content shares it (e.g. a row that also holds a color swatch — keep the outer label there).
   - Drop `style={inputStyle}` / `style={inputFocusStyle}`.
4. If a number input: refactor the handler from `(e: ChangeEvent<HTMLInputElement>) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= MIN && v <= MAX) dispatch(...) }` to `(value: number) => dispatch(...)`. NumberInput already clamps to `min`/`max`.
5. If `inputStyle` and `labelStyle` are now unused module-level consts, delete them. (`grep -n inputStyle <file>` to verify.)
6. Remove any `inputFocused` state and `handleInputFocus` / `handleInputBlur` callbacks — Rialto handles focus styling natively.
7. Remove the `// eslint-disable-next-line no-restricted-syntax` comment.

## Conventions baked in (per CLAUDE.md)

- `Input.error` is `boolean`, not `string`. Show error text in a separate `<div role="alert">`, pass `error={!!errors.field}` to Input.
- `Input.onChange` is `ChangeEventHandler<HTMLInputElement>`. With react-hook-form Controller, wrap as `onChange={(e) => field.onChange(e.target.value)}`.
- Rialto Select label is a `<span>`, not `<label htmlFor>`. The `useSelectLabelFocus` hook works around clicks-don't-focus.
- For `react-hook-form` resolvers on Zod schemas with `.default()`, cast `zodResolver(schema) as any`.

## Don't migrate

Inline `// eslint-disable-next-line no-restricted-syntax -- <reason>` is correct for:

- `<input type="color">` — Rialto has no color picker.
- Hidden `<input type="file">` triggered by a custom click target — Rialto's `ImageUpload` would replace the surrounding UX.
- Decorative readonly preview inputs (e.g. theme preview) — they're not real form fields.
- Tight inline-edit chrome (e.g. 80px tab rename) — Rialto Input's label/padding doesn't fit.

## Verify

```bash
pnpm typecheck
pnpm lint
pnpm test
```

All three should pass cleanly. If the file had tests (`__tests__/<name>.test.tsx`), run them too — Rialto Input renders different DOM than `<input>`, so role-based selectors usually still work but text-based selectors that targeted the visible label may need `getByLabelText` instead.
