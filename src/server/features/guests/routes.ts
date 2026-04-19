import { Hono } from "hono";
import type { AppEnv } from "@server/types";
import { ok, paginated } from "@server/response";
import { NotFoundError, ValidationError } from "@server/errors";
import {
  authMiddleware,
  requirePermission,
} from "@server/features/auth/middleware";
import { createGuestSchema, updateGuestSchema } from "@shared/schemas/guest";
import {
  findGuests,
  findGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  countGuests,
} from "./repository";
import { toGuest } from "./service";

export const guests = new Hono<AppEnv>();

guests.use("/:tenantId/guests/*", authMiddleware);
guests.use("/:tenantId/guests", authMiddleware);

// List guests (paginated, searchable, filterable)
guests.get(
  "/:tenantId/guests",
  requirePermission("guests:read"),
  async (c) => {
    const { tenantId } = c.req.param();
    const q = c.req.query("q") || undefined;
    const tag = c.req.query("tag") || undefined;
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 50));
    const sort = c.req.query("sort") || "created_at";
    const order = c.req.query("order") || "desc";

    const [rows, total] = await Promise.all([
      findGuests(c.env.DB, { tenantId, q, tag, page, limit, sort, order }),
      countGuests(c.env.DB, tenantId, q, tag),
    ]);

    return c.json(paginated(rows.map(toGuest), { total, page, limit }));
  },
);

// Get single guest
guests.get(
  "/:tenantId/guests/:guestId",
  requirePermission("guests:read"),
  async (c) => {
    const { tenantId, guestId } = c.req.param();
    const row = await findGuestById(c.env.DB, guestId, tenantId);
    if (!row) {
      throw new NotFoundError(`Guest not found: ${guestId}`);
    }
    return c.json(ok(toGuest(row)));
  },
);

// Create guest
guests.post(
  "/:tenantId/guests",
  requirePermission("guests:write"),
  async (c) => {
    const { tenantId } = c.req.param();
    const body = await c.req.json();
    const parsed = createGuestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Validation failed",
      );
    }
    const row = await createGuest(c.env.DB, tenantId, parsed.data);
    return c.json(ok(toGuest(row)), 201);
  },
);

// Update guest
guests.patch(
  "/:tenantId/guests/:guestId",
  requirePermission("guests:write"),
  async (c) => {
    const { tenantId, guestId } = c.req.param();
    const existing = await findGuestById(c.env.DB, guestId, tenantId);
    if (!existing) {
      throw new NotFoundError(`Guest not found: ${guestId}`);
    }
    const body = await c.req.json();
    const parsed = updateGuestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Validation failed",
      );
    }
    await updateGuest(
      c.env.DB,
      guestId,
      tenantId,
      parsed.data as {
        readonly name?: string;
        readonly email?: string;
        readonly phone?: string;
        readonly notes?: string;
        readonly tags?: readonly string[];
      },
    );
    const updated = await findGuestById(c.env.DB, guestId, tenantId);
    return c.json(ok(toGuest(updated!)));
  },
);

// Delete guest
guests.delete(
  "/:tenantId/guests/:guestId",
  requirePermission("guests:write"),
  async (c) => {
    const { tenantId, guestId } = c.req.param();
    const deleted = await deleteGuest(c.env.DB, guestId, tenantId);
    if (!deleted) {
      throw new NotFoundError(`Guest not found: ${guestId}`);
    }
    return c.json(ok({ deleted: true }));
  },
);
