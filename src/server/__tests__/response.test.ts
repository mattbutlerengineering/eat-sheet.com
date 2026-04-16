import { describe, it, expect } from "vitest";
import { ok, error, paginated } from "../response";

describe("ok", () => {
  it("wraps data in success envelope", () => {
    const result = ok({ id: "1", name: "test" });
    expect(result).toEqual({ ok: true, data: { id: "1", name: "test" } });
  });

  it("works with null data", () => {
    const result = ok(null);
    expect(result).toEqual({ ok: true, data: null });
  });
});

describe("error", () => {
  it("wraps message in error envelope", () => {
    const result = error("Not found");
    expect(result).toEqual({ ok: false, error: "Not found" });
  });
});

describe("paginated", () => {
  it("wraps data with meta in paginated envelope", () => {
    const items = [{ id: "1" }, { id: "2" }];
    const meta = { total: 10, page: 1, limit: 2 };
    const result = paginated(items, meta);
    expect(result).toEqual({ ok: true, data: items, meta });
  });

  it("works with empty array", () => {
    const result = paginated([], { total: 0, page: 1, limit: 10 });
    expect(result).toEqual({
      ok: true,
      data: [],
      meta: { total: 0, page: 1, limit: 10 },
    });
  });
});
