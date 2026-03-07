import { describe, it, expect } from "vitest";
import { randomQuote, randomLoadingMessage } from "../utils/personality";

describe("personality text rebrand", () => {
  it("randomQuote welcome does not contain Slurms", () => {
    for (let i = 0; i < 20; i++) {
      expect(randomQuote("welcome")).not.toContain("Slurms");
    }
  });

  it("randomQuote contains Chomps references", () => {
    const quotes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      quotes.add(randomQuote("welcome"));
    }
    const hasChomps = [...quotes].some((q) => q.includes("Chomps"));
    expect(hasChomps).toBe(true);
  });

  it("randomLoadingMessage does not contain Slurms", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomLoadingMessage()).not.toContain("Slurms");
    }
  });

  it("no Slurms in any quote context", () => {
    const contexts = [
      "welcome",
      "empty",
      "emptyList",
      "perfect10",
      "celebrate",
      "error",
      "noResults",
      "pickerWin",
      "offline",
    ] as const;

    for (const ctx of contexts) {
      for (let i = 0; i < 30; i++) {
        expect(randomQuote(ctx)).not.toContain("Slurms");
      }
    }
  });

  it("no worm references in any quote context", () => {
    const contexts = [
      "welcome",
      "empty",
      "emptyList",
      "perfect10",
      "celebrate",
      "error",
      "noResults",
      "pickerWin",
      "offline",
    ] as const;

    for (const ctx of contexts) {
      for (let i = 0; i < 30; i++) {
        expect(randomQuote(ctx).toLowerCase()).not.toContain("worm");
      }
    }
  });
});
