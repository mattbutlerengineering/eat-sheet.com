import { useCallback, useState } from "react";
import { useFloorPlanEditorContext } from "../hooks/useFloorPlanEditor";
import type { EditorTable, EditorSection } from "../types";
import type { TableShape } from "@shared/types/floor-plan";

const panelStyle: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderLeft: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  padding: "var(--rialto-space-lg, 16px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-md, 16px)",
  overflowY: "auto",
};

const emptyStyle: React.CSSProperties = {
  ...panelStyle,
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--rialto-space-lg, 16px)",
};

const emptyIconStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "var(--rialto-radius-soft, 12px)",
  background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyTextStyle: React.CSSProperties = {
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-xs, 4px)",
};

const emptyTitleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  fontWeight: 600,
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
};

const emptySubStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.3))",
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  textTransform: "uppercase",
  letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
  marginBottom: "var(--rialto-space-xs, 4px)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
  color: "var(--rialto-text-primary, #e8e2d8)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.2s ease",
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  fontWeight: 600,
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const deleteButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.08))",
  background: "transparent",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  cursor: "pointer",
  marginTop: "auto",
  transition: "border-color 0.2s ease, color 0.2s ease, background 0.2s ease",
};

const deleteButtonHoverStyle: React.CSSProperties = {
  ...deleteButtonStyle,
  borderColor: "var(--rialto-error, #e74c3c)",
  color: "var(--rialto-error, #e74c3c)",
  background: "rgba(231, 76, 60, 0.06)",
};

const shapeSegmentContainerStyle: React.CSSProperties = {
  display: "flex",
  gap: "2px",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
  padding: 2,
};

const countRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
};

const countValueStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
};

const shortcutHintStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: 10,
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.25))",
  textAlign: "center",
  padding: "var(--rialto-space-xs, 4px) 0",
};

function ShapeSegment({
  shape,
  label,
  active,
  accentColor,
  icon,
  onClick,
}: {
  readonly shape: TableShape;
  readonly label: string;
  readonly active: boolean;
  readonly accentColor: string;
  readonly icon: React.ReactNode;
  readonly onClick: (shape: TableShape) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    flex: 1,
    padding: "6px 4px",
    border: "none",
    borderRadius: "var(--rialto-radius-sharp, 4px)",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 11px)",
    cursor: "pointer",
    background: active
      ? `${accentColor}33`
      : hovered
        ? "rgba(232,226,216,0.04)"
        : "transparent",
    color: active
      ? accentColor
      : hovered
        ? "var(--rialto-text-secondary, rgba(232,226,216,0.5))"
        : "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
    fontWeight: active ? 600 : 400,
    transition: "background 0.15s ease, color 0.15s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  };

  const handleClick = useCallback(() => onClick(shape), [onClick, shape]);
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <button
      type="button"
      style={style}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}
      {label}
    </button>
  );
}

function ShapeCircleSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ShapeSquareSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ShapeRectSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1" y="3.5" width="12" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

interface TablePanelProps {
  readonly table: EditorTable;
  readonly accentColor: string;
}

function TablePanel({ table, accentColor }: TablePanelProps) {
  const { dispatch } = useFloorPlanEditorContext();
  const [deleteHovered, setDeleteHovered] = useState(false);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: "UPDATE_TABLE_PROPS",
        id: table.id,
        changes: { label: e.target.value },
      });
    },
    [dispatch, table.id],
  );

  const handleShapeChange = useCallback(
    (shape: TableShape) => {
      dispatch({
        type: "UPDATE_TABLE_PROPS",
        id: table.id,
        changes: { shape },
      });
    },
    [dispatch, table.id],
  );

  const handleMinCapacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 1) {
        dispatch({
          type: "UPDATE_TABLE_PROPS",
          id: table.id,
          changes: { minCapacity: val },
        });
      }
    },
    [dispatch, table.id],
  );

  const handleMaxCapacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 1) {
        dispatch({
          type: "UPDATE_TABLE_PROPS",
          id: table.id,
          changes: { maxCapacity: val },
        });
      }
    },
    [dispatch, table.id],
  );

  const handleDelete = useCallback(() => {
    dispatch({ type: "REMOVE_TABLE", id: table.id });
  }, [dispatch, table.id]);

  return (
    <div style={panelStyle}>
      <div style={sectionTitleStyle}>Table Properties</div>

      <div>
        <label style={labelStyle}>Label</label>
        <input
          type="text"
          value={table.label}
          onChange={handleLabelChange}
          maxLength={20}
          style={inputStyle}
        />
      </div>

      <div>
        <div style={labelStyle}>Shape</div>
        <div style={shapeSegmentContainerStyle}>
          <ShapeSegment shape="circle" label="Round" active={table.shape === "circle"} accentColor={accentColor} icon={<ShapeCircleSmall />} onClick={handleShapeChange} />
          <ShapeSegment shape="square" label="Square" active={table.shape === "square"} accentColor={accentColor} icon={<ShapeSquareSmall />} onClick={handleShapeChange} />
          <ShapeSegment shape="rectangle" label="Long" active={table.shape === "rectangle"} accentColor={accentColor} icon={<ShapeRectSmall />} onClick={handleShapeChange} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--rialto-space-sm, 8px)" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Min Seats</label>
          <input
            type="number"
            value={table.minCapacity}
            onChange={handleMinCapacityChange}
            min={1}
            max={100}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Max Seats</label>
          <input
            type="number"
            value={table.maxCapacity}
            onChange={handleMaxCapacityChange}
            min={1}
            max={100}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        type="button"
        style={deleteHovered ? deleteButtonHoverStyle : deleteButtonStyle}
        onClick={handleDelete}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
      >
        Delete Table
      </button>
      <div style={shortcutHintStyle}>or press Delete key</div>
    </div>
  );
}

interface SectionPanelProps {
  readonly section: EditorSection;
}

function SectionPanel({ section }: SectionPanelProps) {
  const { dispatch } = useFloorPlanEditorContext();
  const [deleteHovered, setDeleteHovered] = useState(false);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: "UPDATE_SECTION",
        id: section.id,
        changes: { name: e.target.value },
      });
    },
    [dispatch, section.id],
  );

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: "UPDATE_SECTION",
        id: section.id,
        changes: { color: e.target.value },
      });
    },
    [dispatch, section.id],
  );

  const handleDelete = useCallback(() => {
    dispatch({ type: "REMOVE_SECTION", id: section.id });
  }, [dispatch, section.id]);

  return (
    <div style={panelStyle}>
      <div style={sectionTitleStyle}>Section Properties</div>

      <div>
        <label style={labelStyle}>Name</label>
        <input
          type="text"
          value={section.name}
          onChange={handleNameChange}
          maxLength={50}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Color</label>
        <div style={{ display: "flex", gap: "var(--rialto-space-sm, 8px)", alignItems: "center" }}>
          <input
            type="color"
            value={section.color}
            onChange={handleColorChange}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              border: "2px solid var(--rialto-border, rgba(255,255,255,0.1))",
              borderRadius: "var(--rialto-radius-sharp, 6px)",
              background: "transparent",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            value={section.color}
            onChange={handleColorChange}
            maxLength={7}
            style={{ ...inputStyle, fontFamily: "var(--rialto-font-mono, monospace)" }}
          />
        </div>
      </div>

      <button
        type="button"
        style={deleteHovered ? deleteButtonHoverStyle : deleteButtonStyle}
        onClick={handleDelete}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
      >
        Delete Section
      </button>
      <div style={shortcutHintStyle}>or press Delete key</div>
    </div>
  );
}

function WallPanel({ wallId }: { readonly wallId: string }) {
  const { dispatch } = useFloorPlanEditorContext();
  const [deleteHovered, setDeleteHovered] = useState(false);

  const handleDelete = useCallback(() => {
    dispatch({ type: "REMOVE_WALL", id: wallId });
  }, [dispatch, wallId]);

  return (
    <div style={panelStyle}>
      <div style={sectionTitleStyle}>Wall</div>
      <div style={emptySubStyle}>
        Click two points on the canvas to draw walls. Walls define room boundaries like Kitchen, Bar, or Store Room.
      </div>
      <button
        type="button"
        style={deleteHovered ? deleteButtonHoverStyle : deleteButtonStyle}
        onClick={handleDelete}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
      >
        Delete Wall
      </button>
      <div style={shortcutHintStyle}>or press Delete key</div>
    </div>
  );
}

interface PropertiesPanelProps {
  readonly accentColor: string;
}

function FloorPlanSettingsPanel() {
  const { state, dispatch } = useFloorPlanEditorContext();

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 400 && val <= 5000) {
        dispatch({ type: "SET_CANVAS_SIZE", width: val, height: state.canvasHeight });
      }
    },
    [dispatch, state.canvasHeight],
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 300 && val <= 5000) {
        dispatch({ type: "SET_CANVAS_SIZE", width: state.canvasWidth, height: val });
      }
    },
    [dispatch, state.canvasWidth],
  );

  return (
    <div style={panelStyle}>
      <div style={sectionTitleStyle}>Floor Plan</div>

      <div style={{ display: "flex", gap: "var(--rialto-space-sm, 8px)" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Width</label>
          <input
            type="number"
            value={state.canvasWidth}
            onChange={handleWidthChange}
            min={400}
            max={5000}
            step={40}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Height</label>
          <input
            type="number"
            value={state.canvasHeight}
            onChange={handleHeightChange}
            min={300}
            max={5000}
            step={40}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{
        padding: "var(--rialto-space-sm, 8px)",
        borderRadius: "var(--rialto-radius-sharp, 6px)",
        background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
        display: "flex",
        flexDirection: "column",
        gap: "var(--rialto-space-xs, 4px)",
      }}>
        <div style={countRowStyle}>
          <span>Tables</span>
          <span style={countValueStyle}>{state.tables.length}</span>
        </div>
        <div style={countRowStyle}>
          <span>Sections</span>
          <span style={countValueStyle}>{state.sections.length}</span>
        </div>
        <div style={countRowStyle}>
          <span>Walls</span>
          <span style={countValueStyle}>{state.walls.length}</span>
        </div>
        <div style={countRowStyle}>
          <span>Total seats</span>
          <span style={countValueStyle}>
            {state.tables.reduce((sum, t) => sum + t.maxCapacity, 0)}
          </span>
        </div>
      </div>

      <div style={shortcutHintStyle}>
        Click a table, section, or wall to edit it
      </div>
    </div>
  );
}

export function PropertiesPanel({ accentColor }: PropertiesPanelProps) {
  const { state } = useFloorPlanEditorContext();

  if (!state.selectedId) {
    return <FloorPlanSettingsPanel />;
  }

  if (state.selectedType === "table") {
    const table = state.tables.find((t) => t.id === state.selectedId);
    if (table) {
      return <TablePanel table={table} accentColor={accentColor} />;
    }
  }

  if (state.selectedType === "section") {
    const section = state.sections.find((s) => s.id === state.selectedId);
    if (section) {
      return <SectionPanel section={section} />;
    }
  }

  if (state.selectedType === "wall") {
    return <WallPanel wallId={state.selectedId} />;
  }

  return (
    <div style={emptyStyle}>
      <div style={emptyTextStyle}>
        <div style={emptyTitleStyle}>No selection</div>
        <div style={emptySubStyle}>
          Click a table or section on the canvas to edit its properties
        </div>
      </div>
    </div>
  );
}
