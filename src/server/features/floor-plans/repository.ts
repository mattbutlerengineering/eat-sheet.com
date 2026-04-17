import { nanoid } from "nanoid";
import type {
  FloorPlanRow,
  FloorPlanSectionRow,
  FloorPlanTableRow,
} from "./types";

export async function findFloorPlansByTenant(
  db: D1Database,
  tenantId: string,
): Promise<FloorPlanRow[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM floor_plans WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC",
    )
    .bind(tenantId)
    .all<FloorPlanRow>();
  return results;
}

export async function findFloorPlanById(
  db: D1Database,
  planId: string,
  tenantId: string,
): Promise<FloorPlanRow | null> {
  const result = await db
    .prepare("SELECT * FROM floor_plans WHERE id = ? AND tenant_id = ?")
    .bind(planId, tenantId)
    .first<FloorPlanRow>();
  return result ?? null;
}

export async function findSectionsByFloorPlan(
  db: D1Database,
  floorPlanId: string,
): Promise<FloorPlanSectionRow[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM floor_plan_sections WHERE floor_plan_id = ? ORDER BY created_at ASC",
    )
    .bind(floorPlanId)
    .all<FloorPlanSectionRow>();
  return results;
}

export async function findTablesByFloorPlan(
  db: D1Database,
  floorPlanId: string,
): Promise<FloorPlanTableRow[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM floor_plan_tables WHERE floor_plan_id = ? ORDER BY created_at ASC",
    )
    .bind(floorPlanId)
    .all<FloorPlanTableRow>();
  return results;
}

export async function createFloorPlan(
  db: D1Database,
  tenantId: string,
  name: string,
): Promise<FloorPlanRow> {
  const id = nanoid();
  const now = new Date().toISOString();

  const maxOrder = await db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM floor_plans WHERE tenant_id = ?",
    )
    .bind(tenantId)
    .first<{ max_order: number }>();

  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  await db
    .prepare(
      `INSERT INTO floor_plans (id, tenant_id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, tenantId, name, sortOrder, now, now)
    .run();

  const row = await db
    .prepare("SELECT * FROM floor_plans WHERE id = ?")
    .bind(id)
    .first<FloorPlanRow>();

  return row!;
}

export async function deleteFloorPlan(
  db: D1Database,
  planId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM floor_plans WHERE id = ? AND tenant_id = ?")
    .bind(planId, tenantId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function renameFloorPlan(
  db: D1Database,
  planId: string,
  tenantId: string,
  name: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      "UPDATE floor_plans SET name = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
    )
    .bind(name, now, planId, tenantId)
    .run();
}

export interface SaveFloorPlanData {
  readonly planId: string;
  readonly tenantId: string;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly layoutDataJson: string;
  readonly tables: readonly {
    readonly id: string;
    readonly label: string;
    readonly shape: string;
    readonly minCapacity: number;
    readonly maxCapacity: number;
    readonly sectionId: string | null;
  }[];
  readonly sections: readonly {
    readonly id: string;
    readonly name: string;
    readonly color: string;
  }[];
}

export async function saveFloorPlan(
  db: D1Database,
  data: SaveFloorPlanData,
): Promise<void> {
  const now = new Date().toISOString();

  const statements: D1PreparedStatement[] = [];

  // Delete existing tables and sections (full replace)
  statements.push(
    db
      .prepare("DELETE FROM floor_plan_tables WHERE floor_plan_id = ?")
      .bind(data.planId),
  );
  statements.push(
    db
      .prepare("DELETE FROM floor_plan_sections WHERE floor_plan_id = ?")
      .bind(data.planId),
  );

  // Insert sections first (tables may reference them)
  for (const section of data.sections) {
    statements.push(
      db
        .prepare(
          `INSERT INTO floor_plan_sections (id, floor_plan_id, name, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(section.id, data.planId, section.name, section.color, now, now),
    );
  }

  // Insert tables
  for (const table of data.tables) {
    statements.push(
      db
        .prepare(
          `INSERT INTO floor_plan_tables
           (id, floor_plan_id, section_id, label, shape, min_capacity, max_capacity, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          table.id,
          data.planId,
          table.sectionId,
          table.label,
          table.shape,
          table.minCapacity,
          table.maxCapacity,
          now,
          now,
        ),
    );
  }

  // Update the floor plan itself
  statements.push(
    db
      .prepare(
        `UPDATE floor_plans
         SET canvas_width = ?, canvas_height = ?, layout_data = ?, updated_at = ?
         WHERE id = ? AND tenant_id = ?`,
      )
      .bind(
        data.canvasWidth,
        data.canvasHeight,
        data.layoutDataJson,
        now,
        data.planId,
        data.tenantId,
      ),
  );

  await db.batch(statements);
}
