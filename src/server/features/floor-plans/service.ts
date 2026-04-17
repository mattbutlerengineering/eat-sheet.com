import type { SaveFloorPlanInput } from "@shared/schemas/floor-plan";
import type { LayoutData } from "@shared/types/floor-plan";
import {
  findFloorPlanById,
  findSectionsByFloorPlan,
  findTablesByFloorPlan,
  saveFloorPlan,
  type SaveFloorPlanData,
} from "./repository";
import type {
  FloorPlanRow,
  FloorPlanSectionRow,
  FloorPlanTableRow,
} from "./types";
import type {
  FloorPlan,
  FloorPlanFull,
  FloorPlanSection,
  FloorPlanTable,
} from "@shared/types/floor-plan";

export function toFloorPlan(row: FloorPlanRow): FloorPlan {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    sortOrder: row.sort_order,
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toFloorPlanTable(row: FloorPlanTableRow): FloorPlanTable {
  return {
    id: row.id,
    floorPlanId: row.floor_plan_id,
    sectionId: row.section_id,
    label: row.label,
    shape: row.shape as FloorPlanTable["shape"],
    minCapacity: row.min_capacity,
    maxCapacity: row.max_capacity,
  };
}

export function toFloorPlanSection(
  row: FloorPlanSectionRow,
): FloorPlanSection {
  return {
    id: row.id,
    floorPlanId: row.floor_plan_id,
    name: row.name,
    color: row.color,
  };
}

export function toFloorPlanFull(
  row: FloorPlanRow,
  tableRows: FloorPlanTableRow[],
  sectionRows: FloorPlanSectionRow[],
): FloorPlanFull {
  return {
    ...toFloorPlan(row),
    layoutData: JSON.parse(row.layout_data) as LayoutData,
    tables: tableRows.map(toFloorPlanTable),
    sections: sectionRows.map(toFloorPlanSection),
  };
}

export async function getFloorPlanFull(
  db: D1Database,
  planId: string,
  tenantId: string,
): Promise<FloorPlanFull | null> {
  const row = await findFloorPlanById(db, planId, tenantId);
  if (!row) return null;

  const [tableRows, sectionRows] = await Promise.all([
    findTablesByFloorPlan(db, planId),
    findSectionsByFloorPlan(db, planId),
  ]);

  return toFloorPlanFull(row, tableRows, sectionRows);
}

export async function saveFloorPlanFromInput(
  db: D1Database,
  planId: string,
  tenantId: string,
  input: SaveFloorPlanInput,
): Promise<FloorPlanFull> {
  const layoutData: LayoutData = {
    tables: input.tables.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation,
    })),
    sections: input.sections.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
    })),
    walls: (input.walls ?? []).map((w) => ({
      id: w.id,
      x1: w.x1,
      y1: w.y1,
      x2: w.x2,
      y2: w.y2,
      thickness: w.thickness,
      ...(w.wallType ? { wallType: w.wallType } : {}),
    })),
  };

  const data: SaveFloorPlanData = {
    planId,
    tenantId,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
    layoutDataJson: JSON.stringify(layoutData),
    tables: input.tables.map((t) => ({
      id: t.id,
      label: t.label,
      shape: t.shape,
      minCapacity: t.minCapacity,
      maxCapacity: t.maxCapacity,
      sectionId: t.sectionId,
    })),
    sections: input.sections.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })),
  };

  await saveFloorPlan(db, data);

  const result = await getFloorPlanFull(db, planId, tenantId);
  return result!;
}
