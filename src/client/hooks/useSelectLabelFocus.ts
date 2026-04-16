import { useEffect } from "react";

/**
 * Global event handler that makes Rialto Select label spans clickable.
 *
 * Rialto's Select renders its label as a <span> (not <label htmlFor>),
 * so clicking the label text doesn't focus the combobox. This hook adds
 * event delegation to connect label clicks to their adjacent combobox.
 *
 * DOM structure targeted:
 *   <div class="wrapper">
 *     <span class="label">Label text</span>   ← click here
 *     <…>
 *       <button role="combobox">…</button>     ← focuses here
 *     </…>
 *   </div>
 */
export function useSelectLabelFocus(): void {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // Only handle clicks on spans that are direct children of a wrapper
      // containing a combobox — i.e., Rialto Select label spans
      if (target.tagName !== "SPAN") return;

      const parent = target.parentElement;
      if (!parent) return;

      const combobox = parent.querySelector<HTMLButtonElement>(
        'button[role="combobox"]',
      );
      if (!combobox) return;

      // Don't interfere if the click was on the combobox itself or its children
      if (combobox.contains(target)) return;

      // Check the span is a label sibling, not something inside the combobox
      if (!target.nextElementSibling && !target.parentElement?.querySelector('button[role="combobox"]')) return;

      combobox.click();
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}
