import type { Page } from "@playwright/test";

/**
 * Interact with a Rialto Select component by its label.
 *
 * Rialto Select renders:
 *   <button role="combobox" aria-label="{label}">…</button>
 *   <div role="listbox">
 *     <div role="option">Option A</div>
 *   </div>
 *
 * The combobox button gets `aria-label` from the `label` prop, so
 * `getByRole('combobox', { name })` targets it cleanly.
 */
export async function selectRialtoOption(
  page: Page,
  labelText: string,
  optionText: string,
): Promise<void> {
  const trigger = page.getByRole("combobox", { name: labelText });
  await trigger.click();

  const listbox = page.getByRole("listbox");
  await listbox.waitFor({ state: "visible" });

  await listbox.getByRole("option", { name: optionText }).click();
}

/**
 * Select a cuisine from the cuisine picker.
 *
 * The cuisine Select has `label="Cuisines"`, so the combobox has
 * `aria-label="Cuisines"`. Each selection adds a tag and resets the
 * dropdown, so each pick is a separate open→click cycle.
 */
export async function selectRialtoCuisine(
  page: Page,
  optionText: string,
): Promise<void> {
  const trigger = page.getByRole("combobox", { name: "Cuisines" });
  await trigger.click();

  const listbox = page.getByRole("listbox");
  await listbox.waitFor({ state: "visible" });

  await listbox.getByRole("option", { name: optionText }).click();

  // Wait for the dropdown to close after selection
  await listbox.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {
    // Dropdown may already be hidden
  });
}
