import { describe, it, expect } from "vitest";
import type { FloorPlanRow, FloorPlanTableRow, FloorPlanSectionRow } from "../types";
import { toFloorPlan, toFloorPlanTable, toFloorPlanSection, toFloorPlanFull } from "../service";

const PLAN_ROW: FloorPlanRow = {
  id: "plan-1",
  tenant_id: "tenant-1",
  name: "Main Floor",
  sort_order: 0,
  canvas_width: 1200,
  canvas_height: 800,
  layout_data: JSON.stringify({
    tables: [{ id: "t1", x: 100, y: 200, width: 60, height: 60, rotation: 45 }],
    sections: [{ id: "s1", x: 0, y: 0, width: 400, height: 300 }],
    walls: [],
  }),
  created_at: "2026-04-16T00:00:00.000Z",
  updated_at: "2026-04-16T00:00:00.000Z",
};

const TABLE_ROW: FloorPlanTableRow = {
  id: "t1",
  floor_plan_id: "plan-1",
  section_id: "s1",
  label: "T1",
  shape: "circle",
  min_capacity: 2,
  max_capacity: 6,
  created_at: "2026-04-16T00:00:00.000Z",
  updated_at: "2026-04-16T00:00:00.000Z",
};

const SECTION_ROW: FloorPlanSectionRow = {
  id: "s1",
  floor_plan_id: "plan-1",
  name: "Patio",
  color: "#4a9d4a",
  created_at: "2026-04-16T00:00:00.000Z",
  updated_at: "2026-04-16T00:00:00.000Z",
};

describe("toFloorPlan", () => {
  it("maps DB row to API type", () => {
    const result = toFloorPlan(PLAN_ROW);

    expect(result.id).toBe("plan-1");
    expect(result.tenantId).toBe("tenant-1");
    expect(result.name).toBe("Main Floor");
    expect(result.sortOrder).toBe(0);
    expect(result.canvasWidth).toBe(1200);
    expect(result.canvasHeight).toBe(800);
    expect(result.createdAt).toBe("2026-04-16T00:00:00.000Z");
  });
});

describe("toFloorPlanTable", () => {
  it("maps DB row to API type", () => {
    const result = toFloorPlanTable(TABLE_ROW);

    expect(result.id).toBe("t1");
    expect(result.floorPlanId).toBe("plan-1");
    expect(result.sectionId).toBe("s1");
    expect(result.label).toBe("T1");
    expect(result.shape).toBe("circle");
    expect(result.minCapacity).toBe(2);
    expect(result.maxCapacity).toBe(6);
  });
});

describe("toFloorPlanSection", () => {
  it("maps DB row to API type", () => {
    const result = toFloorPlanSection(SECTION_ROW);

    expect(result.id).toBe("s1");
    expect(result.floorPlanId).toBe("plan-1");
    expect(result.name).toBe("Patio");
    expect(result.color).toBe("#4a9d4a");
  });
});

describe("toFloorPlanFull", () => {
  it("combines plan, tables, sections, and parses layout_data", () => {
    const result = toFloorPlanFull(PLAN_ROW, [TABLE_ROW], [SECTION_ROW]);

    expect(result.id).toBe("plan-1");
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]!.label).toBe("T1");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.name).toBe("Patio");
    expect(result.layoutData.tables).toHaveLength(1);
    expect(result.layoutData.tables[0]!.x).toBe(100);
    expect(result.layoutData.tables[0]!.rotation).toBe(45);
    expect(result.layoutData.sections).toHaveLength(1);
    expect(result.layoutData.sections[0]!.width).toBe(400);
  });

  it("handles empty tables and sections", () => {
    const emptyPlan: FloorPlanRow = {
      ...PLAN_ROW,
      layout_data: '{"tables":[],"sections":[],"walls":[]}',
    };
    const result = toFloorPlanFull(emptyPlan, [], []);

    expect(result.tables).toHaveLength(0);
    expect(result.sections).toHaveLength(0);
    expect(result.layoutData.tables).toHaveLength(0);
    expect(result.layoutData.sections).toHaveLength(0);
  });
});
