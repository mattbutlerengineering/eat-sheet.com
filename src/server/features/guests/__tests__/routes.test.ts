import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { AppEnv } from "@server/types";
import { DomainError } from "@server/errors";
import { error } from "@server/response";
import type { GuestRow } from "../types";

vi.mock("../repository", () => ({
  findGuests: vi.fn(),
  findGuestById: vi.fn(),
  createGuest: vi.fn(),
  updateGuest: vi.fn(),
  deleteGuest: vi.fn(),
  countGuests: vi.fn(),
}));

import {
  findGuests,
  findGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  countGuests,
} from "../repository";
import { guests } from "../routes";

const mockFindGuests = findGuests as ReturnType<typeof vi.fn>;
const mockFindById = findGuestById as ReturnType<typeof vi.fn>;
const mockCreate = createGuest as ReturnType<typeof vi.fn>;
const mockUpdate = updateGuest as ReturnType<typeof vi.fn>;
const mockDelete = deleteGuest as ReturnType<typeof vi.fn>;
const mockCount = countGuests as ReturnType<typeof vi.fn>;

const JWT_SECRET = "test-secret";

async function makeToken(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  return sign(
    {
      sub: "user-1",
      email: "test@example.com",
      name: "Test User",
      tenantId: "tenant-1",
      roleId: "role-1",
      permissions: ["*"],
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    },
    JWT_SECRET,
  );
}

function buildApp() {
  const app = new Hono<AppEnv>();
  app.route("/api/t", guests);
  app.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json(error(err.message), err.statusCode as 400);
    }
    return c.json(error("Internal server error"), 500);
  });
  return app;
}

const GUEST_ROW: GuestRow = {
  id: "guest-1",
  tenant_id: "tenant-1",
  name: "Sarah Johnson",
  email: "sarah@example.com",
  phone: "+1-555-0123",
  notes: "Prefers booth seating",
  tags: '["regular","vip"]',
  visit_count: 5,
  last_visit_at: "2026-04-10T19:30:00.000Z",
  created_at: "2026-03-01T10:00:00.000Z",
  updated_at: "2026-04-10T19:30:00.000Z",
};

const mockDb = {} as unknown as D1Database;
const env = { JWT_SECRET, DB: mockDb } as AppEnv["Bindings"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/t/:tenantId/guests", () => {
  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request("/api/t/tenant-1/guests", {}, env);
    expect(res.status).toBe(401);
  });

  it("returns 403 without guests:read permission", async () => {
    const app = buildApp();
    const token = await makeToken({ permissions: ["floor_plans:read"] });
    const res = await app.request(
      "/api/t/tenant-1/guests",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("returns paginated guest list", async () => {
    mockFindGuests.mockResolvedValueOnce([GUEST_ROW]);
    mockCount.mockResolvedValueOnce(1);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ total: 1, page: 1, limit: 50 });
    const guest = (body.data as Record<string, unknown>[])[0];
    if (!guest) throw new Error("Expected guest in response");
    expect(guest.name).toBe("Sarah Johnson");
    expect(guest.tags).toEqual(["regular", "vip"]);
    expect(guest.visitCount).toBe(5);
  });

  it("passes search query to repository", async () => {
    mockFindGuests.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const app = buildApp();
    const token = await makeToken();
    await app.request(
      "/api/t/tenant-1/guests?q=sarah&tag=vip&page=2&limit=10&sort=name&order=asc",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(mockFindGuests).toHaveBeenCalledWith(mockDb, {
      tenantId: "tenant-1",
      q: "sarah",
      tag: "vip",
      page: 2,
      limit: 10,
      sort: "name",
      order: "asc",
    });
  });
});

describe("GET /api/t/:tenantId/guests/:guestId", () => {
  it("returns a single guest", async () => {
    mockFindById.mockResolvedValueOnce(GUEST_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/guest-1",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.data as Record<string, unknown>).name).toBe("Sarah Johnson");
  });

  it("returns 404 for missing guest", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/missing",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /api/t/:tenantId/guests", () => {
  it("creates a guest and returns 201", async () => {
    mockCreate.mockResolvedValueOnce(GUEST_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Sarah Johnson",
          email: "sarah@example.com",
          phone: "+1-555-0123",
          notes: "Prefers booth seating",
          tags: ["regular", "vip"],
        }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });

  it("returns 400 for missing name", async () => {
    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "a@b.com" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });

  it("returns 403 without guests:write permission", async () => {
    const app = buildApp();
    const token = await makeToken({ permissions: ["guests:read"] });
    const res = await app.request(
      "/api/t/tenant-1/guests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Test" }),
      },
      env,
    );

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/t/:tenantId/guests/:guestId", () => {
  it("updates a guest", async () => {
    const updatedRow = { ...GUEST_ROW, name: "Sarah J." };
    mockFindById
      .mockResolvedValueOnce(GUEST_ROW)
      .mockResolvedValueOnce(updatedRow);
    mockUpdate.mockResolvedValueOnce(undefined);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/guest-1",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Sarah J." }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.data as Record<string, unknown>).name).toBe("Sarah J.");
  });

  it("returns 404 for non-existent guest", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/missing",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Updated" }),
      },
      env,
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/t/:tenantId/guests/:guestId", () => {
  it("deletes a guest", async () => {
    mockDelete.mockResolvedValueOnce(true);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/guest-1",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.data as Record<string, unknown>).deleted).toBe(true);
  });

  it("returns 404 when guest does not exist", async () => {
    mockDelete.mockResolvedValueOnce(false);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/guests/missing",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );

    expect(res.status).toBe(404);
  });
});
