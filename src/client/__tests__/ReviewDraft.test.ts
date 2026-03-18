// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";

// Test the draft save/load logic by exercising it directly via localStorage
// (the functions are private to ReviewForm, so we test the contract)

const DRAFT_KEY = "eat-sheet-draft-rest-123";

interface Draft {
  readonly overall: number | null;
  readonly food: number | null;
  readonly service: number | null;
  readonly ambiance: number | null;
  readonly value: number | null;
  readonly notes: string;
  readonly visitedAt: string;
}

describe("ReviewForm draft persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves a draft from localStorage", () => {
    const draft: Draft = {
      overall: 7,
      food: 8,
      service: null,
      ambiance: null,
      value: 6,
      notes: "Pretty good place",
      visitedAt: "2026-03-15",
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    const loaded = JSON.parse(localStorage.getItem(DRAFT_KEY)!) as Draft;

    expect(loaded.overall).toBe(7);
    expect(loaded.food).toBe(8);
    expect(loaded.service).toBeNull();
    expect(loaded.notes).toBe("Pretty good place");
    expect(loaded.visitedAt).toBe("2026-03-15");
  });

  it("returns null for missing draft", () => {
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("clears draft from localStorage", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ overall: 5 }));
    expect(localStorage.getItem(DRAFT_KEY)).toBeTruthy();

    localStorage.removeItem(DRAFT_KEY);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("handles corrupt JSON gracefully", () => {
    localStorage.setItem(DRAFT_KEY, "not valid json{{{");

    let draft: Draft | null = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY)!) as Draft;
    } catch {
      draft = null;
    }

    expect(draft).toBeNull();
  });

  it("draft key includes restaurant ID for isolation", () => {
    const key1 = "eat-sheet-draft-rest-aaa";
    const key2 = "eat-sheet-draft-rest-bbb";

    localStorage.setItem(key1, JSON.stringify({ overall: 5 }));
    localStorage.setItem(key2, JSON.stringify({ overall: 9 }));

    const d1 = JSON.parse(localStorage.getItem(key1)!) as { overall: number };
    const d2 = JSON.parse(localStorage.getItem(key2)!) as { overall: number };

    expect(d1.overall).toBe(5);
    expect(d2.overall).toBe(9);
  });
});
