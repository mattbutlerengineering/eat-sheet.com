import { describe, it, expect } from "vitest";
import { getMetrics } from "../service.js";

describe("metrics service", () => {
  it("returns expected shape", () => {
    const m = getMetrics();
    expect(m.version).toBeTruthy();
    expect(m.healthcheck).toBe("ok");
    expect(typeof m.acmm_level).toBe("number");
    expect(m.uptime_seconds).toBe("edge");
  });

  it("acmm fields are non-negative", () => {
    const m = getMetrics();
    expect(m.acmm_level).toBeGreaterThanOrEqual(0);
    expect(m.db_schema_version).toBeGreaterThanOrEqual(0);
  });
});
