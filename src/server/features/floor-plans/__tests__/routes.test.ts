import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { AppEnv } from "@server/types";
import { DomainError } from "@server/errors";
import { error } from "@server/response";
import type { FloorPlanRow, FloorPlanTableRow, FloorPlanSectionRow } from "../types";

vi.mock("../repository", () => ({
  findFloorPlansByTenant: vi.fn(),
  findFloorPlanById: vi.fn(),
  findSectionsByFloorPlan: vi.fn(),
  findTablesByFloorPlan: vi.fn(),
  createFloorPlan: vi.fn(),
  deleteFloorPlan: vi.fn(),
  renameFloorPlan: vi.fn(),
  saveFloorPlan: vi.fn(),
}));

import {
  findFloorPlansByTenant,
  findFloorPlanById,
  findSectionsByFloorPlan,
  findTablesByFloorPlan,
  createFloorPlan,
  deleteFloorPlan,
  renameFloorPlan,
  saveFloorPlan,
} from "../repository";
import { floorPlans } from "../routes";

const mockFindByTenant = findFloorPlansByTenant as ReturnType<typeof vi.fn>;
const mockFindById = findFloorPlanById as ReturnType<typeof vi.fn>;
const mockFindSections = findSectionsByFloorPlan as ReturnType<typeof vi.fn>;
const mockFindTables = findTablesByFloorPlan as ReturnType<typeof vi.fn>;
const mockCreate = createFloorPlan as ReturnType<typeof vi.fn>;
const mockDelete = deleteFloorPlan as ReturnType<typeof vi.fn>;
const mockRename = renameFloorPlan as ReturnType<typeof vi.fn>;
const mockSave = saveFloorPlan as ReturnType<typeof vi.fn>;

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
  app.route("/api/t", floorPlans);
  app.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json(error(err.message), err.statusCode as 400);
    }
    return c.json(error("Internal server error"), 500);
  });
  return app;
}

const PLAN_ROW: FloorPlanRow = {
  id: "plan-1",
  tenant_id: "tenant-1",
  name: "Main Floor",
  sort_order: 0,
  canvas_width: 1200,
  canvas_height: 800,
  layout_data: '{"tables":[],"sections":[],"walls":[]}',
  created_at: "2026-04-16T00:00:00.000Z",
  updated_at: "2026-04-16T00:00:00.000Z",
};

const TABLE_ROW: FloorPlanTableRow = {
  id: "table-1",
  floor_plan_id: "plan-1",
  section_id: null,
  label: "T1",
  shape: "circle",
  min_capacity: 2,
  max_capacity: 4,
  created_at: "2026-04-16T00:00:00.000Z",
  updated_at: "2026-04-16T00:00:00.000Z",
};

const SECTION_ROW: FloorPlanSectionRow = {
  id: "section-1",
  floor_plan_id: "plan-1",
  name: "Patio",
  color: "#4a9d4a",
  created_at: "2026-04-16T00:00:00.000Z",
  updated_at: "2026-04-16T00:00:00.000Z",
};

const mockDb = {} as unknown as D1Database;
const env = { JWT_SECRET, DB: mockDb } as AppEnv["Bindings"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/t/:tenantId/floor-plans", () => {
  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request("/api/t/tenant-1/floor-plans", {}, env);
    expect(res.status).toBe(401);
  });

  it("returns list of floor plans", async () => {
    mockFindByTenant.mockResolvedValueOnce([PLAN_ROW]);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("plan-1");
    expect(body.data[0].name).toBe("Main Floor");
  });

  it("returns 403 without floor_plans:read permission", async () => {
    const app = buildApp();
    const token = await makeToken({ permissions: ["venues:read"] });
    const res = await app.request(
      "/api/t/tenant-1/floor-plans",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/t/:tenantId/floor-plans", () => {
  it("creates a new floor plan", async () => {
    mockCreate.mockResolvedValueOnce(PLAN_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Main Floor" }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe("Main Floor");
  });

  it("returns 400 with empty name", async () => {
    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});

describe("GET /api/t/:tenantId/floor-plans/:planId", () => {
  it("returns full floor plan with tables and sections", async () => {
    const planWithLayout: FloorPlanRow = {
      ...PLAN_ROW,
      layout_data: JSON.stringify({
        tables: [{ id: "table-1", x: 100, y: 200, width: 60, height: 60, rotation: 0 }],
        sections: [{ id: "section-1", x: 0, y: 0, width: 400, height: 300 }],
        walls: [],
      }),
    };

    mockFindById.mockResolvedValueOnce(planWithLayout);
    mockFindTables.mockResolvedValueOnce([TABLE_ROW]);
    mockFindSections.mockResolvedValueOnce([SECTION_ROW]);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/plan-1",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe("plan-1");
    expect(body.data.tables).toHaveLength(1);
    expect(body.data.tables[0].label).toBe("T1");
    expect(body.data.sections).toHaveLength(1);
    expect(body.data.sections[0].name).toBe("Patio");
    expect(body.data.layoutData.tables[0].x).toBe(100);
  });

  it("returns 404 when plan not found", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/t/:tenantId/floor-plans/:planId", () => {
  it("saves floor plan with tables and sections", async () => {
    mockFindById
      .mockResolvedValueOnce(PLAN_ROW) // existence check
      .mockResolvedValueOnce(PLAN_ROW); // re-fetch after save
    mockSave.mockResolvedValueOnce(undefined);
    mockFindTables.mockResolvedValueOnce([TABLE_ROW]);
    mockFindSections.mockResolvedValueOnce([SECTION_ROW]);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/plan-1",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canvasWidth: 1200,
          canvasHeight: 800,
          tables: [
            {
              id: "table-1",
              label: "T1",
              shape: "circle",
              minCapacity: 2,
              maxCapacity: 4,
              sectionId: null,
              x: 100,
              y: 200,
              width: 60,
              height: 60,
              rotation: 0,
            },
          ],
          sections: [],
          walls: [],
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it("returns 404 when plan not found", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/nonexistent",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canvasWidth: 1200,
          canvasHeight: 800,
          tables: [],
          sections: [],
          walls: [],
        }),
      },
      env,
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 with invalid payload", async () => {
    mockFindById.mockResolvedValueOnce(PLAN_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/plan-1",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canvasWidth: -1 }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/t/:tenantId/floor-plans/:planId", () => {
  it("deletes a floor plan", async () => {
    mockDelete.mockResolvedValueOnce(true);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/plan-1",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
  });

  it("returns 404 when plan not found", async () => {
    mockDelete.mockResolvedValueOnce(false);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/nonexistent",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/t/:tenantId/floor-plans/:planId/name", () => {
  it("renames a floor plan", async () => {
    const renamedRow: FloorPlanRow = { ...PLAN_ROW, name: "Upstairs" };
    mockFindById
      .mockResolvedValueOnce(PLAN_ROW) // existence check
      .mockResolvedValueOnce(renamedRow); // re-fetch after rename
    mockRename.mockResolvedValueOnce(undefined);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/plan-1/name",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Upstairs" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe("Upstairs");
  });

  it("returns 400 with empty name", async () => {
    mockFindById.mockResolvedValueOnce(PLAN_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/floor-plans/plan-1/name",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});
