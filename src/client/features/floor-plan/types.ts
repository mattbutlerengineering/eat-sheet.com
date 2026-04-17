import type {
  FloorPlanFull,
  TableShape,
  FloorPlanTable,
  FloorPlanSection,
  WallLayout,
  TableLayout,
  SectionLayout,
} from "@shared/types/floor-plan";

export type EditorTool =
  | "select"
  | "add-circle"
  | "add-square"
  | "add-rectangle"
  | "add-section"
  | "add-wall"
  | "add-window";

export interface EditorTable extends FloorPlanTable {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export interface EditorSection extends FloorPlanSection {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type EditorWall = WallLayout;

export interface LayoutSnapshot {
  readonly tables: readonly EditorTable[];
  readonly sections: readonly EditorSection[];
  readonly walls: readonly EditorWall[];
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

export interface EditorState {
  readonly floorPlan: FloorPlanFull | null;
  readonly tables: readonly EditorTable[];
  readonly sections: readonly EditorSection[];
  readonly walls: readonly EditorWall[];
  readonly selectedId: string | null;
  readonly selectedType: "table" | "section" | "wall" | null;
  readonly clipboard: EditorTable | null;
  readonly tool: EditorTool;
  readonly wallDraftStart: { readonly x: number; readonly y: number } | null;
  readonly zoom: number;
  readonly stagePosition: { readonly x: number; readonly y: number };
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly snapToGrid: boolean;
  readonly history: readonly LayoutSnapshot[];
  readonly future: readonly LayoutSnapshot[];
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly error: string | null;
}

export type EditorAction =
  | { readonly type: "LOAD_SUCCESS"; readonly data: FloorPlanFull }
  | { readonly type: "SELECT"; readonly id: string; readonly elementType: "table" | "section" | "wall" }
  | { readonly type: "DESELECT" }
  | { readonly type: "SET_TOOL"; readonly tool: EditorTool }
  | { readonly type: "ADD_TABLE"; readonly table: EditorTable }
  | {
      readonly type: "MOVE_TABLE";
      readonly id: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "TRANSFORM_TABLE";
      readonly id: string;
      readonly width: number;
      readonly height: number;
      readonly rotation: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "UPDATE_TABLE_PROPS";
      readonly id: string;
      readonly changes: Partial<Pick<EditorTable, "label" | "shape" | "minCapacity" | "maxCapacity" | "sectionId">>;
    }
  | { readonly type: "REMOVE_TABLE"; readonly id: string }
  | { readonly type: "ADD_SECTION"; readonly section: EditorSection }
  | {
      readonly type: "UPDATE_SECTION";
      readonly id: string;
      readonly changes: Partial<Pick<EditorSection, "name" | "color" | "x" | "y" | "width" | "height">>;
    }
  | { readonly type: "REMOVE_SECTION"; readonly id: string }
  | { readonly type: "ADD_WALL"; readonly wall: EditorWall }
  | { readonly type: "REMOVE_WALL"; readonly id: string }
  | { readonly type: "SET_WALL_DRAFT_START"; readonly x: number; readonly y: number }
  | { readonly type: "CLEAR_WALL_DRAFT" }
  | { readonly type: "SET_ZOOM"; readonly zoom: number }
  | { readonly type: "SET_STAGE_POSITION"; readonly x: number; readonly y: number }
  | { readonly type: "SAVE_START" }
  | { readonly type: "SAVE_SUCCESS"; readonly data: FloorPlanFull }
  | { readonly type: "SAVE_ERROR"; readonly error: string }
  | { readonly type: "COPY_TABLE" }
  | { readonly type: "PASTE_TABLE"; readonly newId: string }
  | { readonly type: "TOGGLE_SNAP" }
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  | { readonly type: "SET_CANVAS_SIZE"; readonly width: number; readonly height: number };

export function mergeTablesWithLayout(
  tables: readonly FloorPlanTable[],
  layouts: readonly TableLayout[],
): readonly EditorTable[] {
  const layoutMap = new Map(layouts.map((l) => [l.id, l]));
  return tables.map((t) => {
    const layout = layoutMap.get(t.id);
    return {
      ...t,
      x: layout?.x ?? 100,
      y: layout?.y ?? 100,
      width: layout?.width ?? 60,
      height: layout?.height ?? 60,
      rotation: layout?.rotation ?? 0,
    };
  });
}

export function mergeSectionsWithLayout(
  sections: readonly FloorPlanSection[],
  layouts: readonly SectionLayout[],
): readonly EditorSection[] {
  const layoutMap = new Map(layouts.map((l) => [l.id, l]));
  return sections.map((s) => {
    const layout = layoutMap.get(s.id);
    return {
      ...s,
      x: layout?.x ?? 0,
      y: layout?.y ?? 0,
      width: layout?.width ?? 200,
      height: layout?.height ?? 150,
    };
  });
}
