import { describe, it, expect, vi } from "vitest";
import { generateSlug } from "../service";

function makeDb(existingSlugs: string[]): D1Database {
  const prepare = vi.fn((sql: string) => {
    const stmt = {
      bind: vi.fn((...args: unknown[]) => {
        const slug = args[0] as string;
        const row = existingSlugs.includes(slug) ? { id: slug } : null;
        return { first: vi.fn().mockResolvedValue(row) };
      }),
    };
    return stmt;
  });
  return { prepare } as unknown as D1Database;
}

describe("generateSlug", () => {
  it("converts a name to kebab-case", async () => {
    const db = makeDb([]);
    const slug = await generateSlug(db, "Mario's Trattoria");
    expect(slug).toBe("mario-s-trattoria");
  });

  it("appends -2 when the base slug is already taken", async () => {
    const db = makeDb(["mario-s-trattoria"]);
    const slug = await generateSlug(db, "Mario's Trattoria");
    expect(slug).toBe("mario-s-trattoria-2");
  });

  it("increments suffix until a unique slug is found", async () => {
    const db = makeDb(["test", "test-2", "test-3"]);
    const slug = await generateSlug(db, "test");
    expect(slug).toBe("test-4");
  });

  it("throws ConflictError when all 10 attempts are taken", async () => {
    const taken = [
      "test",
      "test-2",
      "test-3",
      "test-4",
      "test-5",
      "test-6",
      "test-7",
      "test-8",
      "test-9",
      "test-10",
    ];
    const db = makeDb(taken);
    await expect(generateSlug(db, "test")).rejects.toThrow(
      /unique slug/,
    );
  });
});
