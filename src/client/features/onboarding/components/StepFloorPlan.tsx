import { useState, useMemo } from "react";
import { TEMPLATES, TEMPLATE_SIZES } from "@shared/templates/floor-plan";
import { TemplateMiniPreview } from "./TemplateMiniPreview";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

interface StepFloorPlanProps {
  readonly data: FloorPlanSelection | null;
  readonly onChange: (selection: FloorPlanSelection | null) => void;
}

const ONBOARDING_TEMPLATES = TEMPLATES.filter((t) => t.name !== "Blank");

function templateIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function autoSelectSize(tableCount: number): string {
  if (tableCount <= 8) return "cozy";
  if (tableCount <= 14) return "standard";
  if (tableCount <= 20) return "spacious";
  return "grand";
}

function findRecommendedTemplate(tableCount: number | undefined): string | null {
  if (tableCount === undefined || tableCount <= 0) return null;
  const standard = TEMPLATE_SIZES.find((s) => s.label.toLowerCase() === "standard");
  const w = standard?.width ?? 1200;
  const h = standard?.height ?? 800;

  let bestId: string | null = null;
  let bestDiff = Infinity;

  for (const tmpl of ONBOARDING_TEMPLATES) {
    const payload = tmpl.build(w, h);
    const diff = Math.abs(payload.tables.length - tableCount);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = templateIdFromName(tmpl.name);
    }
  }

  return bestId;
}

// --- Styles ---

const wrapperStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "340px 1fr",
  border: "1px solid var(--rialto-border)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  overflow: "hidden",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  minHeight: 540,
};

const leftPanelStyle: React.CSSProperties = {
  padding: "var(--rialto-space-xl, 20px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-xl, 20px)",
  borderRight: "1px solid var(--rialto-border)",
  overflowY: "auto",
};

const rightPanelStyle: React.CSSProperties = {
  padding: "var(--rialto-space-xl, 20px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-md, 12px)",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 11px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  textTransform: "uppercase",
  letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
  color: "var(--rialto-text-tertiary)",
  marginBottom: "var(--rialto-space-xs, 6px)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--rialto-input-bg, rgba(255,255,255,0.06))",
  border: "1px solid var(--rialto-border)",
  borderRadius: "var(--rialto-radius-sm, 6px)",
  color: "var(--rialto-text-primary)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 12px)",
  outline: "none",
  boxSizing: "border-box",
};

const templateGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--rialto-space-sm, 10px)",
};

const sizeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--rialto-space-sm, 10px)",
};

const summaryPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--rialto-space-sm, 10px)",
  background: "var(--rialto-surface-raised, rgba(255,255,255,0.06))",
  border: "1px solid var(--rialto-border)",
  borderRadius: "var(--rialto-radius-pill, 999px)",
  padding: "var(--rialto-space-xs, 6px) var(--rialto-space-md, 12px)",
  fontSize: "var(--rialto-text-xs, 11px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  color: "var(--rialto-text-secondary)",
};

function templateCardStyle(selected: boolean): React.CSSProperties {
  return {
    position: "relative",
    padding: "var(--rialto-space-sm, 10px)",
    background: "var(--rialto-surface-raised, rgba(255,255,255,0.06))",
    border: selected
      ? "2px solid var(--rialto-accent, #c49a2a)"
      : "1px solid var(--rialto-border)",
    borderRadius: "var(--rialto-radius-sm, 6px)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    transition: "border-color 0.15s ease",
  };
}

function sizeCardStyle(selected: boolean): React.CSSProperties {
  return {
    padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 12px)",
    background: "var(--rialto-surface-raised, rgba(255,255,255,0.06))",
    border: selected
      ? "2px solid var(--rialto-accent, #c49a2a)"
      : "1px solid var(--rialto-border)",
    borderRadius: "var(--rialto-radius-sm, 6px)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontFamily: "var(--rialto-font-sans, system-ui)",
    transition: "border-color 0.15s ease",
  };
}

const recommendedBadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: -8,
  right: 4,
  background: "var(--rialto-accent, #c49a2a)",
  color: "#fff",
  fontSize: "9px",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontWeight: 700,
  letterSpacing: "0.06em",
  padding: "2px 5px",
  borderRadius: "var(--rialto-radius-pill, 999px)",
  lineHeight: 1.4,
  pointerEvents: "none",
};

export function StepFloorPlan({ data, onChange }: StepFloorPlanProps) {
  const [tableCount, setTableCount] = useState<number | undefined>(
    data?.tableCount,
  );
  const [seatCount, setSeatCount] = useState<number | undefined>(
    data?.seatCount,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    data?.templateId ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    data?.size ?? "standard",
  );

  const recommendedId = findRecommendedTemplate(tableCount);

  const selectedTemplate = useMemo(
    () =>
      ONBOARDING_TEMPLATES.find(
        (t) => templateIdFromName(t.name) === selectedTemplateId,
      ) ?? null,
    [selectedTemplateId],
  );

  const selectedSizeObj = useMemo(
    () =>
      TEMPLATE_SIZES.find((s) => s.label.toLowerCase() === selectedSize) ??
      TEMPLATE_SIZES[1]!,
    [selectedSize],
  );

  const previewPayload = useMemo(() => {
    if (!selectedTemplate) return null;
    return selectedTemplate.build(selectedSizeObj.width, selectedSizeObj.height);
  }, [selectedTemplate, selectedSizeObj]);

  function handleTemplateSelect(id: string) {
    const newId = id === selectedTemplateId ? null : id;
    setSelectedTemplateId(newId);
    if (newId === null) {
      onChange(null);
    } else {
      onChange({
        templateId: newId,
        size: selectedSize,
        tableCount,
        seatCount,
      });
    }
  }

  function handleSizeSelect(sizeLabel: string) {
    const newSize = sizeLabel.toLowerCase();
    setSelectedSize(newSize);
    if (selectedTemplateId !== null) {
      onChange({
        templateId: selectedTemplateId,
        size: newSize,
        tableCount,
        seatCount,
      });
    }
  }

  function handleTableCountChange(value: string) {
    const parsed = value === "" ? undefined : parseInt(value, 10);
    const count = parsed !== undefined && !isNaN(parsed) ? parsed : undefined;
    setTableCount(count);
    if (count !== undefined) {
      const autoSize = autoSelectSize(count);
      setSelectedSize(autoSize);
      if (selectedTemplateId !== null) {
        onChange({
          templateId: selectedTemplateId,
          size: autoSize,
          tableCount: count,
          seatCount,
        });
      }
    }
  }

  function handleSeatCountChange(value: string) {
    const parsed = value === "" ? undefined : parseInt(value, 10);
    const count = parsed !== undefined && !isNaN(parsed) ? parsed : undefined;
    setSeatCount(count);
    if (selectedTemplateId !== null) {
      onChange({
        templateId: selectedTemplateId,
        size: selectedSize,
        tableCount,
        seatCount: count,
      });
    }
  }

  return (
    <div style={wrapperStyle}>
      {/* Left panel */}
      <div style={leftPanelStyle}>
        {/* Table count input */}
        <div>
          <p style={sectionLabelStyle}>How many tables?</p>
          <input
            type="number"
            min={1}
            placeholder="e.g. 12"
            value={tableCount ?? ""}
            onChange={(e) => handleTableCountChange(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Seat count input */}
        <div>
          <p style={sectionLabelStyle}>How many seats?</p>
          <input
            type="number"
            min={1}
            placeholder="e.g. 48"
            value={seatCount ?? ""}
            onChange={(e) => handleSeatCountChange(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Template grid */}
        <div>
          <p style={sectionLabelStyle}>Choose a template</p>
          <div style={templateGridStyle}>
            {ONBOARDING_TEMPLATES.map((tmpl) => {
              const id = templateIdFromName(tmpl.name);
              const isSelected = selectedTemplateId === id;
              const isRecommended = recommendedId === id;
              // Build at standard size to get table count for display
              const previewCount = tmpl.build(1200, 800).tables.length;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleTemplateSelect(id)}
                  style={templateCardStyle(isSelected)}
                >
                  {isRecommended && (
                    <span style={recommendedBadgeStyle}>Recommended</span>
                  )}
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--rialto-text-sm, 14px)",
                      fontFamily: "var(--rialto-font-sans, system-ui)",
                      fontWeight: 600,
                      color: "var(--rialto-text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {tmpl.name}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--rialto-text-xs, 11px)",
                      fontFamily: "var(--rialto-font-sans, system-ui)",
                      color: "var(--rialto-text-tertiary)",
                    }}
                  >
                    {previewCount} tables
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Size selector */}
        <div>
          <p style={sectionLabelStyle}>Room size</p>
          <div style={sizeGridStyle}>
            {TEMPLATE_SIZES.map((size) => {
              const sizeId = size.label.toLowerCase();
              const isSelected = selectedSize === sizeId;
              return (
                <button
                  key={sizeId}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSizeSelect(size.label)}
                  style={sizeCardStyle(isSelected)}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--rialto-text-sm, 14px)",
                      fontFamily: "var(--rialto-font-sans, system-ui)",
                      fontWeight: 600,
                      color: "var(--rialto-text-primary)",
                    }}
                  >
                    {size.label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--rialto-text-xs, 11px)",
                      fontFamily: "var(--rialto-font-sans, system-ui)",
                      color: "var(--rialto-text-tertiary)",
                    }}
                  >
                    {size.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={rightPanelStyle}>
        <p style={sectionLabelStyle}>Preview</p>

        {previewPayload !== null ? (
          <>
            <TemplateMiniPreview payload={previewPayload} height={340} />
            {/* Summary pill */}
            <div>
              <span style={summaryPillStyle}>
                <span>{previewPayload.tables.length} tables</span>
                {previewPayload.sections.length > 0 && (
                  <>
                    <span
                      aria-hidden="true"
                      style={{ color: "var(--rialto-text-tertiary)" }}
                    >
                      ·
                    </span>
                    <span>{previewPayload.sections.length} sections</span>
                  </>
                )}
              </span>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--rialto-text-tertiary)",
              fontFamily: "var(--rialto-font-sans, system-ui)",
              fontSize: "var(--rialto-text-sm, 14px)",
            }}
          >
            Select a template to preview
          </div>
        )}
      </div>
    </div>
  );
}
