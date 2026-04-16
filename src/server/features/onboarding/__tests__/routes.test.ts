import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { AppEnv } from "@server/types";
import { onboarding } from "../routes";

// ---------------------------------------------------------------------------
// Mock the service module — routes delegate all logic here
// ---------------------------------------------------------------------------

const mockHandleLogoUpload = vi.fn();
const mockCompleteOnboarding = vi.fn();

vi.mock("../service", () => ({
  handleLogoUpload: (...args: unknown[]) => mockHandleLogoUpload(...args),
  completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JWT_SECRET = "test-secret";

async function makeToken(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const payload = {
    sub: "user-1",
    email: "test@example.com",
    name: "Test User",
    tenantId: null,
    roleId: null,
    permissions: [],
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  return sign(payload, JWT_SECRET);
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function mockR2() {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    head: vi.fn(),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  } as unknown as R2Bucket;
}

function mockDb() {
  const stmt = {
    bind: vi.fn(() => stmt),
    first: vi.fn(async () => null),
    run: vi.fn(async () => ({ success: true })),
    all: vi.fn(async () => ({ results: [] })),
  };
  return { prepare: vi.fn(() => stmt), batch: vi.fn(async () => []) } as unknown as D1Database;
}

function buildEnv(overrides: Partial<AppEnv["Bindings"]> = {}): AppEnv["Bindings"] {
  return {
    JWT_SECRET,
    DB: mockDb(),
    LOGOS: mockR2(),
    ASSETS: {} as Fetcher,
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REDIRECT_URI: "",
    SENTRY_DSN: "",
    ...overrides,
  };
}

// Mount routes at /api/onboarding to mirror production setup
function buildApp() {
  const app = new Hono<AppEnv>();
  app.route("/api/onboarding", onboarding);
  return app;
}

const VALID_ONBOARDING_BODY = {
  venueInfo: {
    name: "Verde Kitchen",
    type: "casual",
    cuisines: ["Italian"],
  },
  location: {
    timezone: "America/Los_Angeles",
  },
  brand: {
    accent: "#2d4a2d",
    accentHover: "#1a3a1a",
    surface: null,
    surfaceElevated: null,
    textPrimary: null,
    source: "extracted",
  },
  logoUrl: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("onboarding routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Auth — all routes require authentication
  // =========================================================================

  describe("authentication", () => {
    it("POST /logo returns 401 without token", async () => {
      const app = buildApp();
      const res = await app.request("/api/onboarding/logo", { method: "POST" }, buildEnv());

      expect(res.status).toBe(401);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(false);
    });

    it("POST /complete returns 401 without token", async () => {
      const app = buildApp();
      const res = await app.request(
        "/api/onboarding/complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_ONBOARDING_BODY),
        },
        buildEnv(),
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(false);
    });

    it("GET /logos/:key returns 401 without token", async () => {
      const app = buildApp();
      const res = await app.request("/api/onboarding/logos/user-1/abc.png", {}, buildEnv());

      expect(res.status).toBe(401);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(false);
    });
  });

  // =========================================================================
  // POST /logo
  // =========================================================================

  describe("POST /logo", () => {
    it("returns 400 when no file is provided", async () => {
      const app = buildApp();
      const token = await makeToken();
      const formData = new FormData();

      const res = await app.request(
        "/api/onboarding/logo",
        {
          method: "POST",
          headers: authHeader(token),
          body: formData,
        },
        buildEnv(),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toBe("No file provided");
    });

    it("returns 400 for invalid file type", async () => {
      const app = buildApp();
      const token = await makeToken();
      const file = new File(["test"], "doc.pdf", { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", file);

      const res = await app.request(
        "/api/onboarding/logo",
        {
          method: "POST",
          headers: authHeader(token),
          body: formData,
        },
        buildEnv(),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toContain("Invalid file type");
    });

    it("returns 400 for oversized file (> 2 MB)", async () => {
      const app = buildApp();
      const token = await makeToken();
      // Create a buffer slightly over 2 MB
      const oversized = new Uint8Array(2 * 1024 * 1024 + 1);
      const file = new File([oversized], "big.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);

      const res = await app.request(
        "/api/onboarding/logo",
        {
          method: "POST",
          headers: authHeader(token),
          body: formData,
        },
        buildEnv(),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toContain("File too large");
    });

    it("succeeds with a valid PNG file", async () => {
      const app = buildApp();
      const token = await makeToken();
      const env = buildEnv();

      mockHandleLogoUpload.mockResolvedValue({
        logoUrl: "/api/onboarding/logos/user-1/abc.png",
        extractedColors: ["#ff0000", "#00ff00"],
      });

      const file = new File([new Uint8Array([137, 80, 78, 71])], "logo.png", {
        type: "image/png",
      });
      const formData = new FormData();
      formData.append("file", file);

      const res = await app.request(
        "/api/onboarding/logo",
        {
          method: "POST",
          headers: authHeader(token),
          body: formData,
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        data: { logoUrl: string; extractedColors: string[] };
      };
      expect(body.ok).toBe(true);
      expect(body.data.logoUrl).toBe("/api/onboarding/logos/user-1/abc.png");
      expect(body.data.extractedColors).toEqual(["#ff0000", "#00ff00"]);

      expect(mockHandleLogoUpload).toHaveBeenCalledWith(
        env.LOGOS,
        expect.any(File),
        "user-1",
      );
    });

    it("succeeds with a valid JPEG file", async () => {
      const app = buildApp();
      const token = await makeToken();

      mockHandleLogoUpload.mockResolvedValue({
        logoUrl: "/api/onboarding/logos/user-1/photo.jpg",
        extractedColors: ["#aabbcc"],
      });

      const file = new File([new Uint8Array([0xff, 0xd8])], "photo.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("file", file);

      const res = await app.request(
        "/api/onboarding/logo",
        {
          method: "POST",
          headers: authHeader(token),
          body: formData,
        },
        buildEnv(),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });

    it("succeeds with a valid SVG file", async () => {
      const app = buildApp();
      const token = await makeToken();

      mockHandleLogoUpload.mockResolvedValue({
        logoUrl: "/api/onboarding/logos/user-1/icon.svg",
        extractedColors: [],
      });

      const file = new File(["<svg></svg>"], "icon.svg", {
        type: "image/svg+xml",
      });
      const formData = new FormData();
      formData.append("file", file);

      const res = await app.request(
        "/api/onboarding/logo",
        {
          method: "POST",
          headers: authHeader(token),
          body: formData,
        },
        buildEnv(),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });
  });

  // =========================================================================
  // POST /complete
  // =========================================================================

  describe("POST /complete", () => {
    it("returns 400 for invalid body (missing required fields)", async () => {
      const app = buildApp();
      const token = await makeToken();

      const res = await app.request(
        "/api/onboarding/complete",
        {
          method: "POST",
          headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ venueInfo: { name: "" } }),
        },
        buildEnv(),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toBeDefined();
    });

    it("returns 400 when cuisines array is empty", async () => {
      const app = buildApp();
      const token = await makeToken();

      const invalidBody = {
        ...VALID_ONBOARDING_BODY,
        venueInfo: { name: "Test", type: "casual", cuisines: [] },
      };

      const res = await app.request(
        "/api/onboarding/complete",
        {
          method: "POST",
          headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invalidBody),
        },
        buildEnv(),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toContain("at least one cuisine");
    });

    it("returns 400 when brand accent is not a valid hex color", async () => {
      const app = buildApp();
      const token = await makeToken();

      const invalidBody = {
        ...VALID_ONBOARDING_BODY,
        brand: { ...VALID_ONBOARDING_BODY.brand, accent: "not-a-color" },
      };

      const res = await app.request(
        "/api/onboarding/complete",
        {
          method: "POST",
          headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invalidBody),
        },
        buildEnv(),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toContain("hex color");
    });

    it("succeeds with valid onboarding data and sets cookie", async () => {
      const app = buildApp();
      const token = await makeToken();

      mockCompleteOnboarding.mockResolvedValue("new-jwt-token");

      const env = buildEnv();
      const res = await app.request(
        "/api/onboarding/complete",
        {
          method: "POST",
          headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(VALID_ONBOARDING_BODY),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; data: { token: string } };
      expect(body.ok).toBe(true);
      expect(body.data.token).toBe("new-jwt-token");

      // Verify the Set-Cookie header is present with expected attributes
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("token=new-jwt-token");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Secure");
      expect(setCookie).toContain("SameSite=Lax");
      expect(setCookie).toContain("Path=/");
      expect(setCookie).toContain("Max-Age=604800"); // 7 * 24 * 60 * 60

      // Verify service was called with correct args
      expect(mockCompleteOnboarding).toHaveBeenCalledWith(
        env.DB,
        "user-1",
        "test@example.com",
        expect.objectContaining({
          venueInfo: expect.objectContaining({ name: "Verde Kitchen" }),
          brand: expect.objectContaining({ accent: "#2d4a2d" }),
        }),
        JWT_SECRET,
      );
    });

    it("succeeds with all optional location fields populated", async () => {
      const app = buildApp();
      const token = await makeToken();

      mockCompleteOnboarding.mockResolvedValue("jwt-with-location");

      const fullBody = {
        ...VALID_ONBOARDING_BODY,
        location: {
          addressLine1: "123 Main St",
          addressLine2: "Suite 100",
          city: "San Francisco",
          state: "CA",
          zip: "94102",
          country: "US",
          timezone: "America/Los_Angeles",
          phone: "555-0100",
          website: "https://verde.kitchen",
        },
        logoUrl: "/api/onboarding/logos/user-1/logo.png",
      };

      const res = await app.request(
        "/api/onboarding/complete",
        {
          method: "POST",
          headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fullBody),
        },
        buildEnv(),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });
  });

  // =========================================================================
  // GET /logos/:key
  // =========================================================================

  describe("GET /logos/:key", () => {
    it("returns logo from R2 with correct content type", async () => {
      const app = buildApp();
      const token = await makeToken();
      const env = buildEnv();

      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([137, 80, 78, 71]));
          controller.close();
        },
      });

      (env.LOGOS.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        body: mockBody,
        httpMetadata: { contentType: "image/png" },
      });

      const res = await app.request(
        "/api/onboarding/logos/user-1/abc.png",
        { headers: authHeader(token) },
        env,
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(res.headers.get("cache-control")).toBe(
        "public, max-age=31536000, immutable",
      );

      // Verify R2 was called with the correct key (prefixed with "logos/")
      expect(env.LOGOS.get).toHaveBeenCalledWith("logos/user-1/abc.png");
    });

    it("returns 404 when logo is not found in R2", async () => {
      const app = buildApp();
      const token = await makeToken();
      const env = buildEnv();

      (env.LOGOS.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await app.request(
        "/api/onboarding/logos/user-1/missing.png",
        { headers: authHeader(token) },
        env,
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toBe("Logo not found");
    });

    it("falls back to application/octet-stream when httpMetadata is missing", async () => {
      const app = buildApp();
      const token = await makeToken();
      const env = buildEnv();

      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0, 1, 2]));
          controller.close();
        },
      });

      (env.LOGOS.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        body: mockBody,
        httpMetadata: {},
      });

      const res = await app.request(
        "/api/onboarding/logos/user-1/unknown.bin",
        { headers: authHeader(token) },
        env,
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");
    });

    it("handles nested key paths", async () => {
      const app = buildApp();
      const token = await makeToken();
      const env = buildEnv();

      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0]));
          controller.close();
        },
      });

      (env.LOGOS.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        body: mockBody,
        httpMetadata: { contentType: "image/jpeg" },
      });

      const res = await app.request(
        "/api/onboarding/logos/user-1/sub/path/logo.jpg",
        { headers: authHeader(token) },
        env,
      );

      expect(res.status).toBe(200);
      expect(env.LOGOS.get).toHaveBeenCalledWith("logos/user-1/sub/path/logo.jpg");
    });
  });
});
