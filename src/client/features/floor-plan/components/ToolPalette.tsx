import { useCallback, useState } from "react";
import { useFloorPlanEditorContext } from "../hooks/useFloorPlanEditor";
import type { EditorTool } from "../types";

const paletteStyle: React.CSSProperties = {
  width: 200,
  flexShrink: 0,
  borderRight: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  padding: "var(--rialto-space-lg, 16px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-lg, 16px)",
  overflowY: "auto",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 11px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  textTransform: "uppercase",
  letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
  marginBottom: "var(--rialto-space-xs, 4px)",
};

const toolGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-xs, 4px)",
};

const countStyle: React.CSSProperties = {
  marginTop: "auto",
  padding: "var(--rialto-space-md, 12px) 0",
  borderTop: "1px solid var(--rialto-border, rgba(255,255,255,0.06))",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-xs, 4px)",
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

interface ToolButtonProps {
  readonly label: string;
  readonly tool: EditorTool;
  readonly activeTool: EditorTool;
  readonly accentColor: string;
  readonly icon: React.ReactNode;
  readonly onClick: (tool: EditorTool) => void;
}

function ToolButton({
  label,
  tool,
  activeTool,
  accentColor,
  icon,
  onClick,
}: ToolButtonProps) {
  const isActive = activeTool === tool;
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  const background = isActive
    ? `${accentColor}1a`
    : hovered
      ? "var(--rialto-surface-recessed, rgba(232,226,216,0.04))"
      : "transparent";

  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--rialto-space-sm, 10px)",
    padding: "8px 10px",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 12px)",
    fontWeight: isActive ? 600 : 400,
    color: isActive
      ? accentColor
      : hovered
        ? "var(--rialto-text-primary, #e8e2d8)"
        : "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
    background,
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    transition: "background 0.2s ease, color 0.2s ease",
  };

  const handleClick = useCallback(() => onClick(tool), [onClick, tool]);

  return (
    <button
      type="button"
      style={style}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function CircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RectangleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="4" width="14" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 2L3 13L7 9L11 13L13 11L9 7L13 3L3 2Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function WallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="13" x2="14" y2="3" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

function WindowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="4" x2="8" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

interface ToolPaletteProps {
  readonly accentColor: string;
}

export function ToolPalette({ accentColor }: ToolPaletteProps) {
  const { state, dispatch } = useFloorPlanEditorContext();

  const handleToolClick = useCallback(
    (tool: EditorTool) => {
      dispatch({
        type: "SET_TOOL",
        tool: state.tool === tool ? "select" : tool,
      });
    },
    [dispatch, state.tool],
  );

  return (
    <nav style={paletteStyle} aria-label="Floor plan tools">
      <div style={toolGroupStyle}>
        <div style={sectionLabelStyle}>Tools</div>
        <ToolButton
          label="Select"
          tool="select"
          activeTool={state.tool}
          accentColor={accentColor}
          icon={<SelectIcon />}
          onClick={handleToolClick}
        />
      </div>

      <div style={toolGroupStyle}>
        <div style={sectionLabelStyle}>Tables</div>
        <ToolButton
          label="Round Table"
          tool="add-circle"
          activeTool={state.tool}
          accentColor={accentColor}
          icon={<CircleIcon />}
          onClick={handleToolClick}
        />
        <ToolButton
          label="Square Table"
          tool="add-square"
          activeTool={state.tool}
          accentColor={accentColor}
          icon={<SquareIcon />}
          onClick={handleToolClick}
        />
        <ToolButton
          label="Long Table"
          tool="add-rectangle"
          activeTool={state.tool}
          accentColor={accentColor}
          icon={<RectangleIcon />}
          onClick={handleToolClick}
        />
      </div>

      <div style={toolGroupStyle}>
        <div style={sectionLabelStyle}>Structure</div>
        <ToolButton
          label="Wall"
          tool="add-wall"
          activeTool={state.tool}
          accentColor={accentColor}
          icon={<WallIcon />}
          onClick={handleToolClick}
        />
        <ToolButton
          label="Window"
          tool="add-window"
          activeTool={state.tool}
          accentColor={accentColor}
          icon={<WindowIcon />}
          onClick={handleToolClick}
        />
        <ToolButton
          label="Section"
          tool="add-section"
          activeTool={state.tool}
          accentColor={accentColor}
          icon={<SectionIcon />}
          onClick={handleToolClick}
        />
      </div>

      <div style={countStyle}>
        <div style={countRowStyle}>
          <span>Tables</span>
          <span style={countValueStyle}>{state.tables.length}</span>
        </div>
        <div style={countRowStyle}>
          <span>Sections</span>
          <span style={countValueStyle}>{state.sections.length}</span>
        </div>
        <div style={countRowStyle}>
          <span>Total seats</span>
          <span style={countValueStyle}>
            {state.tables.reduce((sum, t) => sum + t.maxCapacity, 0)}
          </span>
        </div>
      </div>
    </nav>
  );
}
