import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { AppEnv } from "@server/types";
import { ok } from "@server/response";
import { NotFoundError } from "@server/errors";
import { authMiddleware, requirePermission } from "@server/features/auth/middleware";
import { signJwt } from "@server/features/auth/service";
import { findTenantById, findVenueTheme, updateTenant, updateVenueTheme, deleteVenue } from "./repository";
import type { Venue, VenueTheme } from "@shared/types/venue";
import type { TenantRow, VenueThemeRow } from "./types";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export const venues = new Hono<AppEnv>();

function toVenue(row: TenantRow): Venue {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type as Venue["type"],
    cuisines: JSON.parse(row.cuisines) as string[],
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    zip: row.zip,
    country: row.country,
    timezone: row.timezone,
    phone: row.phone,
    website: row.website,
    logoUrl: row.logo_url,
    onboardingCompleted: row.onboarding_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVenueTheme(row: VenueThemeRow): VenueTheme {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accent: row.accent,
    accentHover: row.accent_hover,
    surface: row.surface,
    surfaceElevated: row.surface_elevated,
    textPrimary: row.text_primary,
    source: row.source as VenueTheme["source"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

venues.use("/:tenantId/*", authMiddleware);

venues.get("/:tenantId/venue", async (c) => {
  const { tenantId } = c.req.param();

  const [tenantRow, themeRow] = await Promise.all([
    findTenantById(c.env.DB, tenantId),
    findVenueTheme(c.env.DB, tenantId),
  ]);

  if (!tenantRow) {
    throw new NotFoundError(`Venue not found: ${tenantId}`);
  }

  const venue = toVenue(tenantRow);
  const theme = themeRow ? toVenueTheme(themeRow) : null;

  return c.json(ok({ venue, theme }));
});

venues.patch("/:tenantId/venue", async (c) => {
  const { tenantId } = c.req.param();

  const body = await c.req.json<Record<string, string | number | null>>();

  await updateTenant(c.env.DB, tenantId, body);

  const tenantRow = await findTenantById(c.env.DB, tenantId);
  if (!tenantRow) {
    throw new NotFoundError(`Venue not found: ${tenantId}`);
  }

  return c.json(ok({ venue: toVenue(tenantRow) }));
});

venues.patch("/:tenantId/venue/theme", async (c) => {
  const { tenantId } = c.req.param();

  const body = await c.req.json<Record<string, string | null>>();

  await updateVenueTheme(c.env.DB, tenantId, body);

  const themeRow = await findVenueTheme(c.env.DB, tenantId);
  if (!themeRow) {
    throw new NotFoundError(`Theme not found for venue: ${tenantId}`);
  }

  return c.json(ok({ theme: toVenueTheme(themeRow) }));
});

venues.delete(
  "/:tenantId/venue",
  requirePermission("*"),
  async (c) => {
    const { tenantId } = c.req.param();
    const user = c.var.user;

    // Fetch logo_url before deleting
    const tenantRow = await findTenantById(c.env.DB, tenantId);
    if (!tenantRow) {
      throw new NotFoundError(`Venue not found: ${tenantId}`);
    }

    const deleted = await deleteVenue(c.env.DB, tenantId);
    if (!deleted) {
      throw new NotFoundError(`Venue not found: ${tenantId}`);
    }

    // Delete logo from R2 if present
    if (tenantRow.logo_url) {
      // logo_url: /api/onboarding/logos/user-1/abc123.png → key: logos/user-1/abc123.png
      const prefix = "/api/onboarding/logos/";
      const r2Key = "logos/" + tenantRow.logo_url.slice(prefix.length);
      await c.env.LOGOS.delete(r2Key);
    }

    // Issue new JWT with tenantId: null (tenant is gone)
    const payload = {
      sub: user.userId,
      email: user.email,
      name: user.name,
      tenantId: null,
      roleId: null,
      permissions: [] as readonly string[],
      exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE,
    };

    const token = await signJwt(payload, c.env.JWT_SECRET);

    setCookie(c, "token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return c.json(ok({ token }));
  },
);
