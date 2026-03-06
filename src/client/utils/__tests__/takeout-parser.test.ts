import { describe, it, expect } from "vitest";
import { parseTakeoutFile, extractPlaceId } from "../takeout-parser";

const validFeature = (overrides: Record<string, unknown> = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [-73.9857, 40.7484] },
  properties: {
    Title: "Joe's Pizza",
    "Google Maps URL": "https://www.google.com/maps/place/?q=place_id:ChIJRx5mCmZZwokR1gFm3PgTvNA",
    Location: {
      Address: "7 Carmine St, New York, NY",
      "Geo Coordinates": { Latitude: "40.7306", Longitude: "-73.9866" },
    },
    ...overrides,
  },
});

describe("extractPlaceId", () => {
  it("extracts place_id from Google Maps URL", () => {
    expect(
      extractPlaceId("https://www.google.com/maps/place/?q=place_id:ChIJRx5mCmZZwokR1gFm3PgTvNA")
    ).toBe("ChIJRx5mCmZZwokR1gFm3PgTvNA");
  });

  it("extracts place_id with cid parameter", () => {
    expect(
      extractPlaceId("https://www.google.com/maps/place/?q=place_id:ChIJabc123&cid=12345")
    ).toBe("ChIJabc123");
  });

  it("returns null for URL without place_id", () => {
    expect(extractPlaceId("https://www.google.com/maps/@40.7,-73.9,15z")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractPlaceId("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractPlaceId(undefined as unknown as string)).toBeNull();
  });
});

describe("parseTakeoutFile", () => {
  it("parses valid FeatureCollection", () => {
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: [validFeature()],
    });
    const result = parseTakeoutFile(json);
    expect(result.errors).toHaveLength(0);
    expect(result.places).toHaveLength(1);
    expect(result.places[0].name).toBe("Joe's Pizza");
    expect(result.places[0].googlePlaceId).toBe("ChIJRx5mCmZZwokR1gFm3PgTvNA");
    expect(result.places[0].address).toBe("7 Carmine St, New York, NY");
  });

  it("prefers Geo Coordinates over geometry.coordinates", () => {
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: [validFeature()],
    });
    const result = parseTakeoutFile(json);
    // Geo Coordinates: Lat 40.7306, Lng -73.9866
    expect(result.places[0].latitude).toBeCloseTo(40.7306);
    expect(result.places[0].longitude).toBeCloseTo(-73.9866);
  });

  it("falls back to geometry.coordinates with lng/lat swap", () => {
    const feature = validFeature();
    // Remove Geo Coordinates
    (feature.properties.Location as Record<string, unknown>)["Geo Coordinates"] = undefined;
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: [feature],
    });
    const result = parseTakeoutFile(json);
    // geometry.coordinates is [lng, lat] = [-73.9857, 40.7484]
    expect(result.places[0].latitude).toBeCloseTo(40.7484);
    expect(result.places[0].longitude).toBeCloseTo(-73.9857);
  });

  it("skips features missing Title", () => {
    const feature = validFeature({ Title: undefined });
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: [feature, validFeature()],
    });
    const result = parseTakeoutFile(json);
    expect(result.places).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("skips features missing coordinates entirely", () => {
    const feature = {
      type: "Feature",
      geometry: null,
      properties: { Title: "No Coords Place", "Google Maps URL": "", Location: {} },
    };
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: [feature, validFeature()],
    });
    const result = parseTakeoutFile(json);
    expect(result.places).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("handles missing place_id gracefully", () => {
    const feature = validFeature({
      "Google Maps URL": "https://www.google.com/maps/@40.7,-73.9,15z",
    });
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: [feature],
    });
    const result = parseTakeoutFile(json);
    expect(result.places).toHaveLength(1);
    expect(result.places[0].googlePlaceId).toBeNull();
  });

  it("returns error for invalid JSON", () => {
    const result = parseTakeoutFile("not json {{{");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/invalid json/i);
    expect(result.places).toHaveLength(0);
  });

  it("returns error for non-FeatureCollection", () => {
    const result = parseTakeoutFile(JSON.stringify({ type: "Feature" }));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/FeatureCollection/i);
    expect(result.places).toHaveLength(0);
  });

  it("returns error for file exceeding 10MB", () => {
    const big = "x".repeat(10 * 1024 * 1024 + 1);
    const result = parseTakeoutFile(big);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/10MB/);
    expect(result.places).toHaveLength(0);
  });

  it("parses multiple features with mixed validity", () => {
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: [
        validFeature(),
        validFeature({ Title: "" }), // empty title = skip
        validFeature({ Title: "Second Place" }),
      ],
    });
    const result = parseTakeoutFile(json);
    expect(result.places).toHaveLength(2);
    expect(result.skipped).toBe(1);
    expect(result.places[0].name).toBe("Joe's Pizza");
    expect(result.places[1].name).toBe("Second Place");
  });

  it("handles empty features array", () => {
    const json = JSON.stringify({ type: "FeatureCollection", features: [] });
    const result = parseTakeoutFile(json);
    expect(result.places).toHaveLength(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
