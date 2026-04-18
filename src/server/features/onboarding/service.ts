import { nanoid } from "nanoid";
import { extractDominantColors } from "@server/features/venues/color-extraction";
import { generateSlug } from "@server/features/venues/service";
import { createVenueWithTheme } from "@server/features/venues/repository";
import { buildJwtPayload, signJwt } from "@server/features/auth/service";
import { findUserByEmail } from "@server/features/auth/repository";
import { createFloorPlan, saveFloorPlan, type SaveFloorPlanData } from "@server/features/floor-plans/repository";
import { TEMPLATES, TEMPLATE_SIZES } from "@shared/templates/floor-plan";
import { NotFoundError } from "@server/errors";
import type { OnboardingCompleteInput } from "@shared/schemas/venue";

// ---------------------------------------------------------------------------
// Logo upload
// ---------------------------------------------------------------------------

export interface LogoUploadResult {
  readonly logoUrl: string;
  readonly extractedColors: readonly string[];
}

export async function handleLogoUpload(
  r2: R2Bucket,
  file: File,
  userId: string,
): Promise<LogoUploadResult> {
  const ext = file.name.split(".").pop() ?? "bin";
  const key = `logos/${userId}/${nanoid()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  await r2.put(key, bytes, {
    httpMetadata: { contentType: file.type },
  });

  const extractedColors = await extractDominantColors(bytes, file.type);

  // The logo URL is served via the GET /logos/:key route
  const logoUrl = `/api/onboarding/logos/${key.replace(/^logos\//, "")}`;

  return { logoUrl, extractedColors };
}

// ---------------------------------------------------------------------------
// Complete onboarding
// ---------------------------------------------------------------------------

export async function completeOnboarding(
  db: D1Database,
  userId: string,
  userEmail: string,
  input: OnboardingCompleteInput,
  jwtSecret: string,
): Promise<string> {
  const slug = await generateSlug(db, input.venueInfo.name);

  const ownerRole = await db
    .prepare("SELECT id FROM roles WHERE name = 'Owner' AND is_system = 1")
    .first<{ id: string }>();

  if (!ownerRole) {
    throw new NotFoundError("Owner role not found");
  }

  await createVenueWithTheme(db, {
    name: input.venueInfo.name,
    slug,
    type: input.venueInfo.type,
    cuisines: JSON.stringify(input.venueInfo.cuisines),
    addressLine1: input.location.addressLine1,
    addressLine2: input.location.addressLine2,
    city: input.location.city,
    state: input.location.state,
    zip: input.location.zip,
    country: input.location.country,
    timezone: input.location.timezone,
    phone: input.location.phone,
    website: input.location.website,
    logoUrl: input.logoUrl,
    accent: input.brand.accent,
    accentHover: input.brand.accentHover,
    source: input.brand.source,
    userId,
    ownerRoleId: ownerRole.id,
  });

  if (input.floorPlan) {
    const tenantRow = await db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .bind(slug)
      .first<{ id: string }>();

    if (tenantRow) {
      const template = TEMPLATES.find(
        (t) =>
          t.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") === input.floorPlan!.templateId,
      );

      const size = TEMPLATE_SIZES.find(
        (s) => s.label.toLowerCase() === input.floorPlan!.size,
      );

      if (template && size) {
        const plan = await createFloorPlan(db, tenantRow.id, "Floor 1");
        const payload = template.build(size.width, size.height);

        const layoutData = {
          tables: payload.tables.map((t) => ({
            id: t.id, x: t.x, y: t.y,
            width: t.width, height: t.height, rotation: t.rotation,
          })),
          sections: payload.sections.map((s) => ({
            id: s.id, x: s.x, y: s.y, width: s.width, height: s.height,
          })),
          walls: payload.walls.map((w) => ({
            id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
            thickness: w.thickness,
            ...(w.wallType ? { wallType: w.wallType } : {}),
          })),
        };

        const saveData: SaveFloorPlanData = {
          planId: plan.id,
          tenantId: tenantRow.id,
          canvasWidth: size.width,
          canvasHeight: size.height,
          layoutDataJson: JSON.stringify(layoutData),
          tables: payload.tables.map((t) => ({
            id: t.id,
            label: t.label,
            shape: t.shape,
            minCapacity: t.minCapacity,
            maxCapacity: t.maxCapacity,
            sectionId: t.sectionId,
          })),
          sections: payload.sections.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color,
          })),
        };

        await saveFloorPlan(db, saveData);
      }
    }
  }

  // Fetch full user row so buildJwtPayload has the correct shape
  const userRow = await findUserByEmail(db, userEmail);
  if (!userRow) {
    throw new NotFoundError(`User not found: ${userEmail}`);
  }

  const payload = await buildJwtPayload(db, userRow);
  return signJwt(payload, jwtSecret);
}
