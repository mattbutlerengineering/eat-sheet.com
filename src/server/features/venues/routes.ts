import { Hono } from "hono";
import type { AppEnv } from "@server/types";
import { ok } from "@server/response";
import { NotFoundError } from "@server/errors";
import { authMiddleware } from "@server/features/auth/middleware";
import { findTenantById, findVenueTheme, updateTenant, updateVenueTheme } from "./repository";
import type { Venue, VenueTheme } from "@shared/types/venue";
import type { TenantRow, VenueThemeRow } from "./types";

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
