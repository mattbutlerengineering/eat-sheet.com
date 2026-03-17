import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geocodeAddress } from "../geocode";

describe("geocodeAddress", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns lat/lon for a successful geocode", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "40.7128", lon: "-74.0060" }],
    });

    const result = await geocodeAddress("New York, NY");
    expect(result).toEqual({ lat: 40.7128, lon: -74.006 });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org"),
      expect.objectContaining({ headers: { "User-Agent": "EatSheet/1.0" } })
    );
  });

  it("returns null when no results found", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await geocodeAddress("nonexistent place xyz");
    expect(result).toBeNull();
  });

  it("returns null on HTTP error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const result = await geocodeAddress("test");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const result = await geocodeAddress("test");
    expect(result).toBeNull();
  });

  it("encodes the address in the URL", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await geocodeAddress("123 Main St, New York");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("123%20Main%20St"),
      expect.anything()
    );
  });
});
