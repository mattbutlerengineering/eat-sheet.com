import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { nanoid } from "nanoid";
import { useAuth } from "../hooks/useAuth";
import { VenueThemeProvider } from "../providers/VenueTheme";
import {
  FloorPlanCanvas,
  ToolPalette,
  PropertiesPanel,
  FloorPlanHeader,
  useFloorPlanEditor,
  FloorPlanEditorContext,
} from "../features/floor-plan";
import type { EditorSection } from "../features/floor-plan";
import { TemplatePicker } from "../features/floor-plan/components/TemplatePicker";
import type { FloorPlanTemplate } from "../features/floor-plan/templates";
import type { FloorPlan as FloorPlanType, VenueWithTheme } from "@shared/types";

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "var(--rialto-surface, #1e1c1a)",
};

const editorStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const canvasWrapperStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
};

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--rialto-space-lg, 16px)",
};

const emptyTitleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-xl, 22px)",
  fontWeight: 300,
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const emptySubStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
};

const DEFAULT_ACCENT = "#c49a2a";

function FloorPlanEditorContent({
  plans,
  activePlanId,
  accentColor,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
  onRenamePlan,
  onSave,
  onBack,
}: {
  readonly plans: readonly FloorPlanType[];
  readonly activePlanId: string | null;
  readonly accentColor: string;
  readonly onSelectPlan: (id: string) => void;
  readonly onCreatePlan: () => void;
  readonly onDeletePlan: (id: string) => void;
  readonly onRenamePlan: (id: string, name: string) => void;
  readonly onSave: () => void;
  readonly onBack: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <FloorPlanHeader
        plans={plans}
        activePlanId={activePlanId}
        accentColor={accentColor}
        onSelectPlan={onSelectPlan}
        onCreatePlan={onCreatePlan}
        onDeletePlan={onDeletePlan}
        onRenamePlan={onRenamePlan}
        onSave={onSave}
        onBack={onBack}
      />
      <div style={editorStyle}>
        <ToolPalette accentColor={accentColor} />
        <div ref={canvasRef} style={canvasWrapperStyle}>
          <FloorPlanCanvas
            width={canvasSize.width}
            height={canvasSize.height}
            accentColor={accentColor}
          />
        </div>
        <PropertiesPanel accentColor={accentColor} />
      </div>
    </>
  );
}

export function FloorPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state, dispatch, buildSavePayload } = useFloorPlanEditor();

  const [venue, setVenue] = useState<VenueWithTheme | null>(null);
  const [plans, setPlans] = useState<FloorPlanType[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tenantId = user?.tenantId;
  const accentColor = venue?.theme.accent ?? DEFAULT_ACCENT;

  // Load venue data
  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/t/${tenantId}/venue`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json()) as { ok: boolean; data?: VenueWithTheme };
          if (body.ok && body.data) setVenue(body.data);
        }
      })
      .catch(() => {});
  }, [tenantId]);

  // Load floor plans list
  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/t/${tenantId}/floor-plans`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json()) as { ok: boolean; data?: FloorPlanType[] };
          if (body.ok && body.data) {
            setPlans(body.data);
            if (body.data.length > 0 && !activePlanId) {
              setActivePlanId(body.data[0]!.id);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  // Load active floor plan
  useEffect(() => {
    if (!tenantId || !activePlanId) return;
    fetch(`/api/t/${tenantId}/floor-plans/${activePlanId}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json()) as { ok: boolean; data?: any };
          if (body.ok && body.data) {
            dispatch({ type: "LOAD_SUCCESS", data: body.data });
          }
        }
      })
      .catch(() => {});
  }, [tenantId, activePlanId, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (state.selectedId && state.selectedType === "table") {
          dispatch({ type: "REMOVE_TABLE", id: state.selectedId });
        } else if (state.selectedId && state.selectedType === "section") {
          dispatch({ type: "REMOVE_SECTION", id: state.selectedId });
        } else if (state.selectedId && state.selectedType === "wall") {
          dispatch({ type: "REMOVE_WALL", id: state.selectedId });
        }
      }

      if (e.key === "Escape") {
        dispatch({ type: "DESELECT" });
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (state.selectedId && state.selectedType === "table") {
          e.preventDefault();
          dispatch({ type: "COPY_TABLE" });
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (state.clipboard) {
          e.preventDefault();
          dispatch({ type: "PASTE_TABLE", newId: nanoid() });
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (state.selectedId && state.selectedType === "table") {
          e.preventDefault();
          dispatch({ type: "COPY_TABLE" });
          dispatch({ type: "PASTE_TABLE", newId: nanoid() });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedId, state.selectedType, state.isDirty, state.clipboard, dispatch]);

  const handleSave = useCallback(async () => {
    if (!tenantId || !activePlanId || !state.isDirty) return;

    dispatch({ type: "SAVE_START" });

    try {
      const payload = buildSavePayload();
      const res = await fetch(
        `/api/t/${tenantId}/floor-plans/${activePlanId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        dispatch({
          type: "SAVE_ERROR",
          error: body.error ?? "Failed to save",
        });
        return;
      }

      const body = (await res.json()) as { ok: boolean; data?: any };
      if (body.ok && body.data) {
        dispatch({ type: "SAVE_SUCCESS", data: body.data });
      }
    } catch {
      dispatch({ type: "SAVE_ERROR", error: "Network error" });
    }
  }, [tenantId, activePlanId, state.isDirty, dispatch, buildSavePayload]);

  const handleSelectPlan = useCallback(async (id: string) => {
    if (id === activePlanId) return;

    // Auto-save dirty state before switching
    if (state.isDirty && tenantId && activePlanId) {
      const payload = buildSavePayload();
      try {
        await fetch(`/api/t/${tenantId}/floor-plans/${activePlanId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // Continue switching even if save fails
      }
    }

    setActivePlanId(id);
  }, [activePlanId, tenantId, state.isDirty, buildSavePayload]);

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const handleCreatePlan = useCallback(() => {
    setShowTemplatePicker(true);
  }, []);

  const handleTemplateSelect = useCallback(async (
    template: FloorPlanTemplate,
    width: number,
    height: number,
  ) => {
    if (!tenantId) return;
    setShowTemplatePicker(false);

    const name = `Floor ${plans.length + 1}`;
    try {
      const res = await fetch(`/api/t/${tenantId}/floor-plans`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) return;
      const body = (await res.json()) as { ok: boolean; data?: FloorPlanType };
      if (!body.ok || !body.data) return;

      const plan = body.data;
      const payload = template.build(width, height);

      await fetch(`/api/t/${tenantId}/floor-plans/${plan.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setPlans((prev) => [...prev, plan]);
      setActivePlanId(plan.id);
    } catch {
      // Silently fail
    }
  }, [tenantId, plans.length]);

  const handleDeletePlan = useCallback(async (id: string) => {
    if (!tenantId) return;

    try {
      const res = await fetch(`/api/t/${tenantId}/floor-plans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const remaining = plans.filter((p) => p.id !== id);
        setPlans(remaining);
        if (activePlanId === id) {
          setActivePlanId(remaining.length > 0 ? remaining[0]!.id : null);
        }
      }
    } catch {
      // Silently fail
    }
  }, [tenantId, plans, activePlanId]);

  const handleRenamePlan = useCallback(async (id: string, name: string) => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/t/${tenantId}/floor-plans/${id}/name`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      }
    } catch {
      // Silently fail
    }
  }, [tenantId]);

  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Handle section add from tool
  useEffect(() => {
    if (state.tool !== "add-section") return;

    const newSection: EditorSection = {
      id: nanoid(),
      floorPlanId: state.floorPlan?.id ?? "",
      name: `Section ${state.sections.length + 1}`,
      color: "#4a9d4a",
      x: 50,
      y: 50,
      width: 300,
      height: 200,
    };

    dispatch({ type: "ADD_SECTION", section: newSection });
  }, [state.tool]);

  if (loading) {
    return (
      <div style={pageStyle} data-theme="dark">
        <div
          style={{
            ...emptyStateStyle,
            height: "100vh",
          }}
          role="status"
          aria-label="Loading"
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: "2px solid var(--rialto-border, rgba(255,255,255,0.1))",
              borderTopColor: accentColor,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <VenueThemeProvider theme={venue?.theme ?? null}>
      <FloorPlanEditorContext.Provider value={{ state, dispatch }}>
        <main id="main-content" style={pageStyle} data-theme="dark">
          {plans.length === 0 && !loading ? (
            <>
              <FloorPlanHeader
                plans={[]}
                activePlanId={null}
                accentColor={accentColor}
                onSelectPlan={handleSelectPlan}
                onCreatePlan={handleCreatePlan}
                onDeletePlan={handleDeletePlan}
                onRenamePlan={handleRenamePlan}
                onSave={handleSave}
                onBack={handleBack}
              />
              <div style={emptyStateStyle}>
                <div style={emptyTitleStyle}>No floor plans yet</div>
                <div style={emptySubStyle}>
                  Create your first floor plan to start laying out your space.
                </div>
                <button
                  type="button"
                  onClick={handleCreatePlan}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "var(--rialto-radius-default, 8px)",
                    border: "none",
                    background: accentColor,
                    color: "var(--rialto-text-on-accent, #1a1918)",
                    fontFamily: "var(--rialto-font-sans, system-ui)",
                    fontSize: "var(--rialto-text-sm, 13px)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create Floor Plan
                </button>
              </div>
            </>
          ) : (
            <FloorPlanEditorContent
              plans={plans}
              activePlanId={activePlanId}
              accentColor={accentColor}
              onSelectPlan={handleSelectPlan}
              onCreatePlan={handleCreatePlan}
              onDeletePlan={handleDeletePlan}
              onRenamePlan={handleRenamePlan}
              onSave={handleSave}
              onBack={handleBack}
            />
          )}
        </main>
      </FloorPlanEditorContext.Provider>
      {showTemplatePicker && (
        <TemplatePicker
          accentColor={accentColor}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </VenueThemeProvider>
  );
}
