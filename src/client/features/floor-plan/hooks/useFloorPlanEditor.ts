import { useReducer, useCallback, createContext, useContext } from "react";
import type {
  EditorState,
  EditorAction,
  EditorTable,
  LayoutSnapshot,
} from "../types";
import { mergeTablesWithLayout, mergeSectionsWithLayout } from "../types";
import type { FloorPlanFull, SaveFloorPlanPayload } from "@shared/types/floor-plan";

const PASTE_OFFSET = 30;
const GRID_SIZE = 20;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

const MAX_HISTORY = 50;

function takeSnapshot(state: EditorState): LayoutSnapshot {
  return { tables: state.tables, sections: state.sections, walls: state.walls, canvasWidth: state.canvasWidth, canvasHeight: state.canvasHeight };
}

function pushHistory(state: EditorState): Pick<EditorState, "history" | "future"> {
  const history = [...state.history, takeSnapshot(state)];
  if (history.length > MAX_HISTORY) history.shift();
  return { history, future: [] };
}

// Actions that mutate layout and should be undoable
const UNDOABLE_ACTIONS = new Set([
  "ADD_TABLE", "MOVE_TABLE", "TRANSFORM_TABLE", "UPDATE_TABLE_PROPS", "REMOVE_TABLE",
  "ADD_SECTION", "UPDATE_SECTION", "REMOVE_SECTION",
  "ADD_WALL", "REMOVE_WALL",
  "PASTE_TABLE", "SET_CANVAS_SIZE",
]);

const initialState: EditorState = {
  floorPlan: null,
  tables: [],
  sections: [],
  walls: [],
  selectedId: null,
  selectedType: null,
  clipboard: null,
  tool: "select",
  wallDraftStart: null,
  snapToGrid: true,
  history: [],
  future: [],
  zoom: 1,
  stagePosition: { x: 0, y: 0 },
  canvasWidth: 1200,
  canvasHeight: 800,
  isDirty: false,
  isSaving: false,
  error: null,
};

function coreReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_SUCCESS": {
      const { data } = action;
      return {
        ...state,
        floorPlan: data,
        tables: mergeTablesWithLayout(data.tables, data.layoutData.tables),
        sections: mergeSectionsWithLayout(data.sections, data.layoutData.sections),
        walls: data.layoutData.walls ?? [],
        canvasWidth: data.canvasWidth,
        canvasHeight: data.canvasHeight,
        isDirty: false,
        error: null,
      };
    }

    case "SELECT":
      return {
        ...state,
        selectedId: action.id,
        selectedType: action.elementType,
        tool: "select",
        wallDraftStart: null,
      };

    case "DESELECT":
      return { ...state, selectedId: null, selectedType: null };

    case "SET_TOOL":
      return { ...state, tool: action.tool, selectedId: null, selectedType: null, wallDraftStart: null };

    case "ADD_TABLE":
      return {
        ...state,
        tables: [...state.tables, action.table],
        selectedId: action.table.id,
        selectedType: "table",
        tool: "select",
        isDirty: true,
      };

    case "MOVE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, x: action.x, y: action.y } : t,
        ),
        isDirty: true,
      };

    case "TRANSFORM_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id
            ? {
                ...t,
                width: action.width,
                height: action.height,
                rotation: action.rotation,
                x: action.x,
                y: action.y,
              }
            : t,
        ),
        isDirty: true,
      };

    case "UPDATE_TABLE_PROPS":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, ...action.changes } : t,
        ),
        isDirty: true,
      };

    case "REMOVE_TABLE":
      return {
        ...state,
        tables: state.tables.filter((t) => t.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        selectedType: state.selectedId === action.id ? null : state.selectedType,
        isDirty: true,
      };

    case "ADD_SECTION":
      return {
        ...state,
        sections: [...state.sections, action.section],
        selectedId: action.section.id,
        selectedType: "section",
        tool: "select",
        isDirty: true,
      };

    case "UPDATE_SECTION":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.id ? { ...s, ...action.changes } : s,
        ),
        isDirty: true,
      };

    case "REMOVE_SECTION": {
      const removedId = action.id;
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== removedId),
        tables: state.tables.map((t) =>
          t.sectionId === removedId ? { ...t, sectionId: null } : t,
        ),
        selectedId: state.selectedId === removedId ? null : state.selectedId,
        selectedType: state.selectedId === removedId ? null : state.selectedType,
        isDirty: true,
      };
    }

    case "ADD_WALL":
      return {
        ...state,
        walls: [...state.walls, action.wall],
        wallDraftStart: null,
        isDirty: true,
      };

    case "REMOVE_WALL":
      return {
        ...state,
        walls: state.walls.filter((w) => w.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        selectedType: state.selectedId === action.id ? null : state.selectedType,
        isDirty: true,
      };

    case "SET_WALL_DRAFT_START":
      return { ...state, wallDraftStart: { x: action.x, y: action.y } };

    case "CLEAR_WALL_DRAFT":
      return { ...state, wallDraftStart: null };

    case "SET_ZOOM":
      return { ...state, zoom: action.zoom };

    case "SET_STAGE_POSITION":
      return { ...state, stagePosition: { x: action.x, y: action.y } };

    case "SAVE_START":
      return { ...state, isSaving: true, error: null };

    case "SAVE_SUCCESS": {
      const { data } = action;
      return {
        ...state,
        floorPlan: data,
        tables: mergeTablesWithLayout(data.tables, data.layoutData.tables),
        sections: mergeSectionsWithLayout(data.sections, data.layoutData.sections),
        walls: data.layoutData.walls ?? [],
        isSaving: false,
        isDirty: false,
      };
    }

    case "SAVE_ERROR":
      return { ...state, isSaving: false, error: action.error };

    case "COPY_TABLE": {
      if (!state.selectedId || state.selectedType !== "table") return state;
      const table = state.tables.find((t) => t.id === state.selectedId);
      if (!table) return state;
      return { ...state, clipboard: table };
    }

    case "PASTE_TABLE": {
      if (!state.clipboard) return state;
      const source = state.clipboard;
      const nextLabel = `T${state.tables.length + 1}`;
      const px = state.snapToGrid ? snapToGrid(source.x + PASTE_OFFSET) : source.x + PASTE_OFFSET;
      const py = state.snapToGrid ? snapToGrid(source.y + PASTE_OFFSET) : source.y + PASTE_OFFSET;
      const pasted: EditorTable = {
        ...source,
        id: action.newId,
        label: nextLabel,
        x: px,
        y: py,
      };
      return {
        ...state,
        tables: [...state.tables, pasted],
        selectedId: pasted.id,
        selectedType: "table",
        clipboard: pasted,
        isDirty: true,
      };
    }

    case "TOGGLE_SNAP":
      return { ...state, snapToGrid: !state.snapToGrid };

    case "UNDO": {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1]!;
      return {
        ...state,
        tables: previous.tables,
        sections: previous.sections,
        walls: previous.walls,
        canvasWidth: previous.canvasWidth,
        canvasHeight: previous.canvasHeight,
        history: state.history.slice(0, -1),
        future: [takeSnapshot(state), ...state.future],
        selectedId: null,
        selectedType: null,
        isDirty: true,
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0]!;
      return {
        ...state,
        tables: next.tables,
        sections: next.sections,
        walls: next.walls,
        canvasWidth: next.canvasWidth,
        canvasHeight: next.canvasHeight,
        history: [...state.history, takeSnapshot(state)],
        future: state.future.slice(1),
        selectedId: null,
        selectedType: null,
        isDirty: true,
      };
    }

    case "SET_CANVAS_SIZE":
      return {
        ...state,
        canvasWidth: action.width,
        canvasHeight: action.height,
        isDirty: true,
      };

    default:
      return state;
  }
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  // Push history before undoable actions
  if (UNDOABLE_ACTIONS.has(action.type)) {
    const stateWithHistory = { ...state, ...pushHistory(state) };
    return coreReducer(stateWithHistory, action);
  }
  return coreReducer(state, action);
}

export interface FloorPlanEditorContextValue {
  readonly state: EditorState;
  readonly dispatch: React.Dispatch<EditorAction>;
}

export const FloorPlanEditorContext =
  createContext<FloorPlanEditorContextValue | null>(null);

export function useFloorPlanEditorContext(): FloorPlanEditorContextValue {
  const ctx = useContext(FloorPlanEditorContext);
  if (!ctx) {
    throw new Error(
      "useFloorPlanEditorContext must be used within FloorPlanEditorContext.Provider",
    );
  }
  return ctx;
}

export function useFloorPlanEditor() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const buildSavePayload = useCallback((): SaveFloorPlanPayload => {
    return {
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      tables: state.tables.map((t) => ({
        id: t.id,
        label: t.label,
        shape: t.shape,
        minCapacity: t.minCapacity,
        maxCapacity: t.maxCapacity,
        sectionId: t.sectionId,
        x: Math.round(t.x),
        y: Math.round(t.y),
        width: Math.round(t.width),
        height: Math.round(t.height),
        rotation: Math.round(t.rotation),
      })),
      sections: state.sections.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        x: Math.round(s.x),
        y: Math.round(s.y),
        width: Math.round(s.width),
        height: Math.round(s.height),
      })),
      walls: state.walls.map((w) => ({
        id: w.id,
        x1: Math.round(w.x1),
        y1: Math.round(w.y1),
        x2: Math.round(w.x2),
        y2: Math.round(w.y2),
        thickness: w.thickness,
        ...(w.wallType ? { wallType: w.wallType } : {}),
      })),
    };
  }, [state.canvasWidth, state.canvasHeight, state.tables, state.sections, state.walls]);

  return { state, dispatch, buildSavePayload };
}
