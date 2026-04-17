export interface FloorPlanRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly sort_order: number;
  readonly canvas_width: number;
  readonly canvas_height: number;
  readonly layout_data: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface FloorPlanSectionRow {
  readonly id: string;
  readonly floor_plan_id: string;
  readonly name: string;
  readonly color: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface FloorPlanTableRow {
  readonly id: string;
  readonly floor_plan_id: string;
  readonly section_id: string | null;
  readonly label: string;
  readonly shape: string;
  readonly min_capacity: number;
  readonly max_capacity: number;
  readonly created_at: string;
  readonly updated_at: string;
}
