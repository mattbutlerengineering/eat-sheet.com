import { nanoid } from "nanoid";
import type { TenantRow, VenueThemeRow } from "./types";

export async function findTenantBySlug(
  db: D1Database,
  slug: string,
): Promise<TenantRow | null> {
  const result = await db
    .prepare("SELECT * FROM tenants WHERE slug = ?")
    .bind(slug)
    .first<TenantRow>();
  return result ?? null;
}

export async function findTenantById(
  db: D1Database,
  id: string,
): Promise<TenantRow | null> {
  const result = await db
    .prepare("SELECT * FROM tenants WHERE id = ?")
    .bind(id)
    .first<TenantRow>();
  return result ?? null;
}

export async function findVenueTheme(
  db: D1Database,
  tenantId: string,
): Promise<VenueThemeRow | null> {
  const result = await db
    .prepare("SELECT * FROM venue_themes WHERE tenant_id = ?")
    .bind(tenantId)
    .first<VenueThemeRow>();
  return result ?? null;
}

export interface CreateVenueData {
  readonly name: string;
  readonly slug: string;
  readonly type: string;
  readonly cuisines: string;
  readonly country: string;
  readonly timezone: string;
  readonly addressLine1: string;
  readonly addressLine2: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  readonly phone: string;
  readonly website: string;
  readonly logoUrl: string | null;
  readonly accent: string;
  readonly accentHover: string;
  readonly source: "extracted" | "manual";
  readonly userId: string;
  readonly ownerRoleId: string;
}

export async function createVenueWithTheme(
  db: D1Database,
  data: CreateVenueData,
): Promise<{ tenantId: string; themeId: string }> {
  const tenantId = nanoid();
  const themeId = nanoid();
  const memberId = nanoid();
  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO tenants
          (id, name, slug, type, cuisines, address_line1, address_line2, city, state, zip,
           country, timezone, phone, website, logo_url, onboarding_completed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(
        tenantId,
        data.name,
        data.slug,
        data.type,
        data.cuisines,
        data.addressLine1 || null,
        data.addressLine2 || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.country,
        data.timezone,
        data.phone || null,
        data.website || null,
        data.logoUrl,
        now,
        now,
      ),
    db
      .prepare(
        `INSERT INTO venue_themes
          (id, tenant_id, accent, accent_hover, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(themeId, tenantId, data.accent, data.accentHover, data.source, now, now),
    db
      .prepare(
        `INSERT INTO tenant_members (id, tenant_id, user_id, role_id, created_at)
          VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(memberId, tenantId, data.userId, data.ownerRoleId, now),
  ]);

  return { tenantId, themeId };
}

export async function updateTenant(
  db: D1Database,
  id: string,
  fields: Partial<Record<string, string | number | null>>,
): Promise<void> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const now = new Date().toISOString();
  const setClauses = [...entries.map(([k]) => `${k} = ?`), "updated_at = ?"].join(", ");
  const values = [...entries.map(([, v]) => v), now, id];

  await db
    .prepare(`UPDATE tenants SET ${setClauses} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function updateVenueTheme(
  db: D1Database,
  tenantId: string,
  fields: Partial<Record<string, string | null>>,
): Promise<void> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const now = new Date().toISOString();
  const setClauses = [...entries.map(([k]) => `${k} = ?`), "updated_at = ?"].join(", ");
  const values = [...entries.map(([, v]) => v), now, tenantId];

  await db
    .prepare(`UPDATE venue_themes SET ${setClauses} WHERE tenant_id = ?`)
    .bind(...values)
    .run();
}
