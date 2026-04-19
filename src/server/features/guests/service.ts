import type { GuestRow } from "./types";
import type { Guest } from "@shared/types/guest";

export function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    tags: JSON.parse(row.tags) as string[],
    visitCount: row.visit_count,
    lastVisitAt: row.last_visit_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
