import { Hono } from "hono";
import type { AppEnv } from "@server/types";
import { ok } from "@server/response";
import { NotFoundError, ValidationError } from "@server/errors";
import { authMiddleware, requirePermission } from "@server/features/auth/middleware";
import {
  createFloorPlanSchema,
  renameFloorPlanSchema,
  saveFloorPlanSchema,
} from "@shared/schemas/floor-plan";
import {
  findFloorPlansByTenant,
  createFloorPlan,
  deleteFloorPlan,
  renameFloorPlan,
  findFloorPlanById,
} from "./repository";
import {
  toFloorPlan,
  getFloorPlanFull,
  saveFloorPlanFromInput,
} from "./service";

export const floorPlans = new Hono<AppEnv>();

floorPlans.use("/:tenantId/floor-plans/*", authMiddleware);
floorPlans.use("/:tenantId/floor-plans", authMiddleware);

// List all floor plans (summary)
floorPlans.get(
  "/:tenantId/floor-plans",
  requirePermission("floor_plans:read"),
  async (c) => {
    const { tenantId } = c.req.param();
    const rows = await findFloorPlansByTenant(c.env.DB, tenantId);
    return c.json(ok(rows.map(toFloorPlan)));
  },
);

// Create a new floor plan
floorPlans.post(
  "/:tenantId/floor-plans",
  requirePermission("floor_plans:write"),
  async (c) => {
    const { tenantId } = c.req.param();
    const body = await c.req.json();
    const parsed = createFloorPlanSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const row = await createFloorPlan(c.env.DB, tenantId, parsed.data.name);
    return c.json(ok(toFloorPlan(row)), 201);
  },
);

// Get full floor plan (layout + tables + sections)
floorPlans.get(
  "/:tenantId/floor-plans/:planId",
  requirePermission("floor_plans:read"),
  async (c) => {
    const { tenantId, planId } = c.req.param();
    const result = await getFloorPlanFull(c.env.DB, planId, tenantId);

    if (!result) {
      throw new NotFoundError("Floor plan not found");
    }

    return c.json(ok(result));
  },
);

// Full save (atomic replace of tables, sections, layout)
floorPlans.put(
  "/:tenantId/floor-plans/:planId",
  requirePermission("floor_plans:write"),
  async (c) => {
    const { tenantId, planId } = c.req.param();

    const existing = await findFloorPlanById(c.env.DB, planId, tenantId);
    if (!existing) {
      throw new NotFoundError("Floor plan not found");
    }

    const body = await c.req.json();
    const parsed = saveFloorPlanSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const result = await saveFloorPlanFromInput(
      c.env.DB,
      planId,
      tenantId,
      parsed.data,
    );

    return c.json(ok(result));
  },
);

// Rename floor plan
floorPlans.patch(
  "/:tenantId/floor-plans/:planId/name",
  requirePermission("floor_plans:write"),
  async (c) => {
    const { tenantId, planId } = c.req.param();

    const existing = await findFloorPlanById(c.env.DB, planId, tenantId);
    if (!existing) {
      throw new NotFoundError("Floor plan not found");
    }

    const body = await c.req.json();
    const parsed = renameFloorPlanSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    await renameFloorPlan(c.env.DB, planId, tenantId, parsed.data.name);

    const updated = await findFloorPlanById(c.env.DB, planId, tenantId);
    return c.json(ok(toFloorPlan(updated!)));
  },
);

// Delete floor plan
floorPlans.delete(
  "/:tenantId/floor-plans/:planId",
  requirePermission("floor_plans:write"),
  async (c) => {
    const { tenantId, planId } = c.req.param();
    const deleted = await deleteFloorPlan(c.env.DB, planId, tenantId);

    if (!deleted) {
      throw new NotFoundError("Floor plan not found");
    }

    return c.json(ok(null));
  },
);
