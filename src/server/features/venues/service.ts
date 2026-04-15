import { ConflictError } from "@server/errors";
import { findTenantBySlug } from "./repository";

const MAX_SLUG_ATTEMPTS = 10;

function toBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateSlug(db: D1Database, name: string): Promise<string> {
  const base = toBaseSlug(name);

  const existing = await findTenantBySlug(db, base);
  if (!existing) return base;

  for (let i = 2; i <= MAX_SLUG_ATTEMPTS; i++) {
    const candidate = `${base}-${i}`;
    const conflict = await findTenantBySlug(db, candidate);
    if (!conflict) return candidate;
  }

  throw new ConflictError(
    `Could not generate a unique slug for "${name}" after ${MAX_SLUG_ATTEMPTS} attempts`,
  );
}
