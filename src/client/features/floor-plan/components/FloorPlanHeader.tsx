import { useCallback, useState } from "react";
import { useFloorPlanEditorContext } from "../hooks/useFloorPlanEditor";
import type { FloorPlan } from "@shared/types/floor-plan";

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-lg, 16px)",
  borderBottom: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-lg, 18px)",
  fontWeight: 300,
  color: "var(--rialto-text-primary, #e8e2d8)",
  letterSpacing: "-0.01em",
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: "2px",
  background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  padding: 2,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--rialto-space-sm, 8px)",
};

const zoomLabelStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
  minWidth: 40,
  textAlign: "center",
};

interface FloorPlanHeaderProps {
  readonly plans: readonly FloorPlan[];
  readonly activePlanId: string | null;
  readonly accentColor: string;
  readonly onSelectPlan: (id: string) => void;
  readonly onCreatePlan: () => void;
  readonly onDeletePlan: (id: string) => void;
  readonly onRenamePlan: (id: string, name: string) => void;
  readonly onSave: () => void;
  readonly onBack: () => void;
}

function ZoomButton({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
    background: hovered
      ? "var(--rialto-surface-recessed, rgba(232,226,216,0.06))"
      : "transparent",
    color: hovered
      ? "var(--rialto-text-primary, #e8e2d8)"
      : "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-sm, 14px)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  };

  return (
    <button
      type="button"
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
    >
      {label === "Zoom in" ? "+" : "\u2212"}
    </button>
  );
}

function TabButton({
  plan,
  isActive,
  accentColor,
  canDelete,
  onClick,
  onDelete,
  onRename,
}: {
  readonly plan: FloorPlan;
  readonly isActive: boolean;
  readonly accentColor: string;
  readonly canDelete: boolean;
  readonly onClick: () => void;
  readonly onDelete: () => void;
  readonly onRename: (name: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(plan.name);

  const style: React.CSSProperties = {
    padding: "4px 12px",
    paddingRight: canDelete && hovered && !editing ? 4 : 12,
    border: "none",
    borderRadius: 4,
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 11px)",
    cursor: "pointer",
    background: isActive
      ? `${accentColor}33`
      : hovered
        ? "rgba(232,226,216,0.04)"
        : "transparent",
    color: isActive
      ? accentColor
      : hovered
        ? "var(--rialto-text-secondary, rgba(232,226,216,0.5))"
        : "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
    fontWeight: isActive ? 600 : 400,
    transition: "background 0.15s ease, color 0.15s ease",
    display: "flex",
    alignItems: "center",
    gap: 4,
  };

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(plan.name);
    setEditing(true);
  }, [plan.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== plan.name) {
      onRename(trimmed);
    }
    setEditing(false);
  }, [editValue, plan.name, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") setEditing(false);
  }, [handleRenameSubmit]);

  if (editing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleRenameSubmit}
        onKeyDown={handleKeyDown}
        autoFocus
        maxLength={100}
        style={{
          padding: "3px 8px",
          border: `1px solid ${accentColor}`,
          borderRadius: 4,
          background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
          color: accentColor,
          fontFamily: "var(--rialto-font-sans, system-ui)",
          fontSize: "var(--rialto-text-xs, 11px)",
          fontWeight: 600,
          outline: "none",
          width: 80,
        }}
      />
    );
  }

  return (
    <button
      type="button"
      style={style}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {plan.name}
      {canDelete && hovered && (
        <span
          onClick={handleDeleteClick}
          role="button"
          aria-label={`Delete ${plan.name}`}
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
            cursor: "pointer",
          }}
        >
          &times;
        </span>
      )}
    </button>
  );
}

export function FloorPlanHeader({
  plans,
  activePlanId,
  accentColor,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
  onRenamePlan,
  onSave,
  onBack,
}: FloorPlanHeaderProps) {
  const { state, dispatch } = useFloorPlanEditorContext();
  const [backHovered, setBackHovered] = useState(false);
  const [saveHovered, setSaveHovered] = useState(false);
  const [addHovered, setAddHovered] = useState(false);

  const handleToggleSnap = useCallback(() => {
    dispatch({ type: "TOGGLE_SNAP" });
  }, [dispatch]);

  const handleZoomIn = useCallback(() => {
    dispatch({ type: "SET_ZOOM", zoom: Math.min(4, state.zoom + 0.1) });
  }, [dispatch, state.zoom]);

  const handleZoomOut = useCallback(() => {
    dispatch({ type: "SET_ZOOM", zoom: Math.max(0.25, state.zoom - 0.1) });
  }, [dispatch, state.zoom]);

  const backButtonStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
    background: backHovered
      ? "var(--rialto-surface-recessed, rgba(232,226,216,0.06))"
      : "transparent",
    color: backHovered
      ? "var(--rialto-text-primary, #e8e2d8)"
      : "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 12px)",
    cursor: "pointer",
    transition: "background 0.15s ease, color 0.15s ease",
  };

  const canSave = state.isDirty && !state.isSaving;
  const saveButtonStyle: React.CSSProperties = {
    padding: "6px 16px",
    borderRadius: "var(--rialto-radius-sharp, 6px)",
    border: "none",
    background: canSave
      ? saveHovered
        ? "var(--rialto-accent-hover, #a07d1f)"
        : accentColor
      : "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
    color: canSave
      ? "var(--rialto-text-on-accent, #1a1918)"
      : "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 12px)",
    fontWeight: 600,
    cursor: canSave ? "pointer" : "default",
    opacity: state.isSaving ? 0.6 : 1,
    transition: "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
  };

  const addButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    border: "none",
    borderRadius: 4,
    background: addHovered ? "rgba(232,226,216,0.04)" : "transparent",
    color: addHovered
      ? "var(--rialto-text-secondary, rgba(232,226,216,0.5))"
      : "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    fontSize: "var(--rialto-text-xs, 12px)",
    cursor: "pointer",
    transition: "background 0.15s ease, color 0.15s ease",
  };

  return (
    <header style={headerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--rialto-space-md, 16px)" }}>
        <button
          type="button"
          style={backButtonStyle}
          onClick={onBack}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
        >
          &larr; Back
        </button>
        <div style={titleStyle}>Floor Plan</div>

        {plans.length > 0 && (
          <div style={tabsStyle}>
            {plans.map((plan) => (
              <TabButton
                key={plan.id}
                plan={plan}
                isActive={plan.id === activePlanId}
                accentColor={accentColor}
                canDelete
                onClick={() => onSelectPlan(plan.id)}
                onDelete={() => onDeletePlan(plan.id)}
                onRename={(name) => onRenamePlan(plan.id, name)}
              />
            ))}
            <button
              type="button"
              style={addButtonStyle}
              onClick={onCreatePlan}
              onMouseEnter={() => setAddHovered(true)}
              onMouseLeave={() => setAddHovered(false)}
              aria-label="Create new floor plan"
            >
              +
            </button>
          </div>
        )}
      </div>

      <div style={actionsStyle}>
        <button
          type="button"
          onClick={handleToggleSnap}
          aria-label={state.snapToGrid ? "Disable snap to grid" : "Enable snap to grid"}
          aria-pressed={state.snapToGrid}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--rialto-radius-sharp, 6px)",
            border: `1px solid ${state.snapToGrid ? `${accentColor}44` : "var(--rialto-border, rgba(255,255,255,0.1))"}`,
            background: state.snapToGrid ? `${accentColor}1a` : "transparent",
            color: state.snapToGrid ? accentColor : "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
            fontFamily: "var(--rialto-font-sans, system-ui)",
            fontSize: "var(--rialto-text-xs, 11px)",
            fontWeight: state.snapToGrid ? 600 : 400,
            cursor: "pointer",
            transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
          }}
        >
          Snap
        </button>
        <div style={{ width: 1, height: 16, background: "var(--rialto-border, rgba(255,255,255,0.08))" }} />
        <ZoomButton label="Zoom out" onClick={handleZoomOut} />
        <span style={zoomLabelStyle}>{Math.round(state.zoom * 100)}%</span>
        <ZoomButton label="Zoom in" onClick={handleZoomIn} />
        <button
          type="button"
          style={saveButtonStyle}
          onClick={onSave}
          onMouseEnter={() => setSaveHovered(true)}
          onMouseLeave={() => setSaveHovered(false)}
          disabled={!canSave}
        >
          {state.isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </header>
  );
}
