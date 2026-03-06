import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import app from "../index";
import { createMockDb } from "./helpers/mock-db";
import { makeToken, authHeader, TEST_SECRET } from "./helpers/auth";

const PLACES_API_KEY = "test-google-places-key";

function mockEnv(db?: D1Database) {
  const { db: mockDb } = createMockDb();
  return {
    DB: db ?? mockDb,
    JWT_SECRET: TEST_SECRET,
    GOOGLE_PLACES_API_KEY: PLACES_API_KEY,
  };
}

function mockEnvNoKey() {
  const { db } = createMockDb();
  return { DB: db, JWT_SECRET: TEST_SECRET, GOOGLE_PLACES_API_KEY: "" };
}

describe("Places API", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("POST /api/places/autocomplete", () => {
    it("should require auth", async () => {
      const res = await app.request("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "pizza" }),
      }, mockEnv());

      expect(res.status).toBe(401);
    });

    it("should return 400 for empty input", async () => {
      const token = await makeToken();
      const res = await app.request("/api/places/autocomplete", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ input: "" }),
      }, mockEnv());

      expect(res.status).toBe(400);
    });

    it("should return 503 when API key not configured", async () => {
      const token = await makeToken();
      const res = await app.request("/api/places/autocomplete", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ input: "pizza" }),
      }, mockEnvNoKey());

      expect(res.status).toBe(503);
    });

    it("should proxy autocomplete results", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                placeId: "ChIJ123",
                text: { text: "Joe's Pizza, New York, NY" },
                structuredFormat: {
                  mainText: { text: "Joe's Pizza" },
                  secondaryText: { text: "New York, NY" },
                },
              },
            },
          ],
        }), { status: 200 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/autocomplete", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ input: "joe's pizza", latitude: 40.7, longitude: -74.0 }),
      }, mockEnv());

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].place_id).toBe("ChIJ123");
      expect(body.data[0].name).toBe("Joe's Pizza");
      expect(body.data[0].secondary_text).toBe("New York, NY");

      // Verify the fetch was called with correct params
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("places:autocomplete");
      const fetchBody = JSON.parse(fetchCall[1].body);
      expect(fetchBody.input).toBe("joe's pizza");
      expect(fetchBody.locationBias).toBeDefined();
    });

    it("should handle Google API errors gracefully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response("Internal error", { status: 500 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/autocomplete", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ input: "pizza" }),
      }, mockEnv());

      expect(res.status).toBe(502);
    });

    it("should return empty array when no suggestions", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/autocomplete", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ input: "xyznonexistent" }),
      }, mockEnv());

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(0);
    });

    it("should include session token when provided", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ suggestions: [] }), { status: 200 })
      );

      const token = await makeToken();
      await app.request("/api/places/autocomplete", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ input: "pizza", sessionToken: "sess-123" }),
      }, mockEnv());

      const fetchBody = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(fetchBody.sessionToken).toBe("sess-123");
    });
  });

  describe("GET /api/places/:placeId", () => {
    it("should require auth", async () => {
      const res = await app.request("/api/places/ChIJ123", {}, mockEnv());
      expect(res.status).toBe(401);
    });

    it("should return 503 when API key not configured", async () => {
      const token = await makeToken();
      const res = await app.request("/api/places/ChIJ123", {
        headers: authHeader(token),
      }, mockEnvNoKey());

      expect(res.status).toBe(503);
    });

    it("should return mapped place details", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: "ChIJ123",
          displayName: { text: "Joe's Pizza" },
          formattedAddress: "7 Carmine St, New York, NY 10014",
          location: { latitude: 40.7308, longitude: -74.0020 },
          types: ["pizza_restaurant", "restaurant"],
          googleMapsUri: "https://maps.google.com/?cid=123",
        }), { status: 200 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/ChIJ123", {
        headers: authHeader(token),
      }, mockEnv());

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.name).toBe("Joe's Pizza");
      expect(body.data.address).toBe("7 Carmine St, New York, NY 10014");
      expect(body.data.latitude).toBe(40.7308);
      expect(body.data.longitude).toBe(-74.0020);
      expect(body.data.google_place_id).toBe("ChIJ123");
      expect(body.data.cuisine).toBe("Pizza");
      expect(body.data.google_maps_uri).toBe("https://maps.google.com/?cid=123");

      // Verify field mask was sent
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers["X-Goog-FieldMask"]).toContain("displayName");
    });

    it("should pass session token as query param", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: "ChIJ123",
          displayName: { text: "Test" },
        }), { status: 200 })
      );

      const token = await makeToken();
      await app.request("/api/places/ChIJ123?sessionToken=sess-456", {
        headers: authHeader(token),
      }, mockEnv());

      const fetchUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(fetchUrl).toContain("sessionToken=sess-456");
    });

    it("should handle Google API errors gracefully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response("Not found", { status: 404 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/ChIJbadid", {
        headers: authHeader(token),
      }, mockEnv());

      expect(res.status).toBe(502);
    });

    it("should return null cuisine for unknown types", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: "ChIJ789",
          displayName: { text: "Mystery Spot" },
          types: ["restaurant", "food"],
        }), { status: 200 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/ChIJ789", {
        headers: authHeader(token),
      }, mockEnv());

      const body: any = await res.json();
      expect(body.data.cuisine).toBeNull();
    });
  });

  describe("POST /api/places/nearby", () => {
    it("should require auth", async () => {
      const res = await app.request("/api/places/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
      }, mockEnv());

      expect(res.status).toBe(401);
    });

    it("should return 400 when latitude/longitude missing", async () => {
      const token = await makeToken();
      const res = await app.request("/api/places/nearby", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({}),
      }, mockEnv());

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error).toContain("latitude");
    });

    it("should return 503 when API key not configured", async () => {
      const token = await makeToken();
      const res = await app.request("/api/places/nearby", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
      }, mockEnvNoKey());

      expect(res.status).toBe(503);
    });

    it("should return nearby places with community ratings", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({
          places: [
            {
              id: "place-abc",
              displayName: { text: "Taco Town" },
              formattedAddress: "100 Main St",
              location: { latitude: 40.71, longitude: -74.01 },
              types: ["mexican_restaurant", "restaurant"],
              rating: 4.5,
              userRatingCount: 200,
              googleMapsUri: "https://maps.google.com/?cid=abc",
            },
            {
              id: "place-def",
              displayName: { text: "Sushi Spot" },
              formattedAddress: "200 Broadway",
              location: { latitude: 40.72, longitude: -74.02 },
              types: ["japanese_restaurant", "restaurant"],
              rating: 4.2,
              userRatingCount: 150,
              googleMapsUri: "https://maps.google.com/?cid=def",
            },
          ],
        }), { status: 200 })
      );

      // Mock DB: place-abc has community reviews, place-def does not
      const { db } = createMockDb({
        all: {
          "google_place_id IN": [
            { google_place_id: "place-abc", avg_score: 7.8, review_count: 3 },
          ],
        },
      });

      const token = await makeToken();
      const res = await app.request("/api/places/nearby", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
      }, { DB: db, JWT_SECRET: TEST_SECRET, GOOGLE_PLACES_API_KEY: PLACES_API_KEY });

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(2);

      // First place has community data
      expect(body.data[0].google_place_id).toBe("place-abc");
      expect(body.data[0].name).toBe("Taco Town");
      expect(body.data[0].address).toBe("100 Main St");
      expect(body.data[0].cuisine).toBe("Mexican");
      expect(body.data[0].google_rating).toBe(4.5);
      expect(body.data[0].google_rating_count).toBe(200);
      expect(body.data[0].eat_sheet_score).toBe(7.8);
      expect(body.data[0].eat_sheet_reviews).toBe(3);

      // Second place has no community data
      expect(body.data[1].google_place_id).toBe("place-def");
      expect(body.data[1].name).toBe("Sushi Spot");
      expect(body.data[1].cuisine).toBe("Japanese");
      expect(body.data[1].eat_sheet_score).toBeNull();
      expect(body.data[1].eat_sheet_reviews).toBe(0);

      // Verify fetch was called with correct params
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("places:searchNearby");
      const fetchBody = JSON.parse(fetchCall[1].body);
      expect(fetchBody.locationRestriction.circle.center.latitude).toBe(40.7);
      expect(fetchBody.rankPreference).toBe("POPULARITY");
    });

    it("should handle Google API errors gracefully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response("Internal error", { status: 500 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/nearby", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
      }, mockEnv());

      expect(res.status).toBe(502);
    });

    it("should return empty array when no places found", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      const token = await makeToken();
      const res = await app.request("/api/places/nearby", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ latitude: 40.7, longitude: -74.0 }),
      }, mockEnv());

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data).toHaveLength(0);
    });
  });
});
