import { useState, useMemo, useRef } from "react";
import { AnimatePresence, motion, type MotionStyle } from "framer-motion";
import { Input } from "@mattbutlerengineering/rialto";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;
import { TEMPLATES, TEMPLATE_SIZES, templateIdFromName } from "@shared/templates/floor-plan";
import { TemplateMiniPreview } from "./TemplateMiniPreview";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

interface StepFloorPlanProps {
  readonly data: FloorPlanSelection | null;
  readonly onChange: (selection: FloorPlanSelection | null) => void;
}

const ONBOARDING_TEMPLATES = TEMPLATES.filter((t) => t.name !== "Blank");

const MAX_REASONABLE_COUNT = 500;

const STANDARD_SIZE = TEMPLATE_SIZES.find(
  (s) => s.label.toLowerCase() === "standard",
);
const STANDARD_W = STANDARD_SIZE?.width ?? 1200;
const STANDARD_H = STANDARD_SIZE?.height ?? 800;

interface TemplateMeta {
  readonly id: string;
  readonly name: string;
  readonly tableCount: number;
  readonly totalSeats: number;
}

const TEMPLATE_META: readonly TemplateMeta[] = ONBOARDING_TEMPLATES.map(
  (tmpl) => {
    const payload = tmpl.build(STANDARD_W, STANDARD_H);
    return {
      id: templateIdFromName(tmpl.name),
      name: tmpl.name,
      tableCount: payload.tables.length,
      totalSeats: payload.tables.reduce((sum, t) => sum + t.maxCapacity, 0),
    };
  },
);

function autoSelectSize(tableCount: number): string {
  if (tableCount <= 8) return "cozy";
  if (tableCount <= 14) return "standard";
  if (tableCount <= 20) return "spacious";
  return "grand";
}

// Normalized distance: |a - b| / max(a, b). Range [0, 1]. 0 = perfect match.
function normalizedDiff(a: number, b: number): number {
  const m = Math.max(a, b);
  return m === 0 ? 0 : Math.abs(a - b) / m;
}

function findRecommendedTemplate(
  tableCount: number | undefined,
  seatCount: number | undefined,
): string | null {
  const hasTables = tableCount !== undefined && tableCount > 0;
  const hasSeats = seatCount !== undefined && seatCount > 0;
  if (!hasTables && !hasSeats) return null;

  let bestId: string | null = null;
  let bestScore = Infinity;
  for (const meta of TEMPLATE_META) {
    let score = 0;
    if (hasTables) score += normalizedDiff(meta.tableCount, tableCount);
    if (hasSeats) score += normalizedDiff(meta.totalSeats, seatCount);
    if (score < bestScore) {
      bestScore = score;
      bestId = meta.id;
    }
  }
  return bestId;
}

// --- Styles ---

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  border: "1px solid var(--rialto-border)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  overflow: "hidden",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  minHeight: 540,
};

const leftPanelStyle: React.CSSProperties = {
  flex: "0 0 340px",
  minWidth: 0,
  padding: "var(--rialto-space-xl, 20px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-xl, 20px)",
  borderRight: "1px solid var(--rialto-border)",
  overflowY: "auto",
};

const rightPanelStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
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
  // Once the user clicks a size, we stop auto-selecting size from table count.
  // If `data.size` was preloaded (returning to step), treat as already chosen.
  const sizeWasChosenByUser = useRef<boolean>(data?.size !== undefined);

  const recommendedId = useMemo(
    () => findRecommendedTemplate(tableCount, seatCount),
    [tableCount, seatCount],
  );

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
    sizeWasChosenByUser.current = true;
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

  function clampCount(value: string): number | undefined {
    if (value === "") return undefined;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) return undefined;
    return Math.min(parsed, MAX_REASONABLE_COUNT);
  }

  function handleTableCountChange(value: string) {
    const count = clampCount(value);
    setTableCount(count);
    // Only auto-suggest size if the user hasn't explicitly picked one yet.
    const nextSize =
      count !== undefined && !sizeWasChosenByUser.current
        ? autoSelectSize(count)
        : selectedSize;
    if (nextSize !== selectedSize) setSelectedSize(nextSize);
    if (count !== undefined && selectedTemplateId !== null) {
      onChange({
        templateId: selectedTemplateId,
        size: nextSize,
        tableCount: count,
        seatCount,
      });
    }
  }

  function handleSeatCountChange(value: string) {
    const count = clampCount(value);
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
    <motion.div
      style={ms(wrapperStyle)}
      className="step-floor-plan"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Left panel */}
      <motion.div style={ms(leftPanelStyle)} variants={fadeUp}>
        {/* Table count input */}
        <Input
          label="How many tables?"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_REASONABLE_COUNT}
          placeholder="e.g. 12"
          value={tableCount ?? ""}
          onChange={(e) => handleTableCountChange(e.target.value)}
          showOptional
        />

        {/* Seat count input */}
        <Input
          label="How many seats?"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_REASONABLE_COUNT}
          placeholder="e.g. 48"
          value={seatCount ?? ""}
          onChange={(e) => handleSeatCountChange(e.target.value)}
          showOptional
        />

        {/* Template grid */}
        <div role="group" aria-labelledby="template-group-label">
          <p id="template-group-label" style={sectionLabelStyle}>Choose a template</p>
          <div style={templateGridStyle}>
            {TEMPLATE_META.map((meta) => {
              const isSelected = selectedTemplateId === meta.id;
              const isRecommended = recommendedId === meta.id;
              return (
                <button
                  key={meta.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleTemplateSelect(meta.id)}
                  style={templateCardStyle(isSelected)}
                >
                  <AnimatePresence>
                    {isRecommended && (
                      <motion.span
                        key="recommended"
                        style={ms(recommendedBadgeStyle)}
                        initial={{ opacity: 0, scale: 0.7, y: -2 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      >
                        Recommended
                      </motion.span>
                    )}
                  </AnimatePresence>
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
                    {meta.name}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--rialto-text-xs, 11px)",
                      fontFamily: "var(--rialto-font-sans, system-ui)",
                      color: "var(--rialto-text-tertiary)",
                    }}
                  >
                    {meta.tableCount} tables
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Size selector */}
        <div role="group" aria-labelledby="size-group-label">
          <p id="size-group-label" style={sectionLabelStyle}>Room size</p>
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
      </motion.div>

      {/* Right panel */}
      <motion.div style={ms(rightPanelStyle)} className="preview-col" variants={fadeUp}>
        <div>
          <p style={sectionLabelStyle}>Preview</p>
          <p style={{
            margin: "2px 0 0",
            fontFamily: "var(--rialto-font-sans, system-ui)",
            fontSize: "var(--rialto-text-xs, 11px)",
            color: "var(--rialto-text-tertiary)",
          }}>
            You can customize this later in the editor
          </p>
        </div>

        {previewPayload !== null ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedTemplateId}:${selectedSize}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <TemplateMiniPreview
                  payload={previewPayload}
                  height={340}
                  ariaLabel={
                    selectedTemplate
                      ? `${selectedTemplate.name} floor plan preview at ${selectedSize} size, ${previewPayload.tables.length} tables`
                      : undefined
                  }
                />
              </motion.div>
            </AnimatePresence>
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
      </motion.div>
      <style>{`
        .step-floor-plan button[aria-pressed="false"] {
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }
        .step-floor-plan button[aria-pressed="false"]:hover {
          border-color: var(--rialto-border-strong, rgba(255,255,255,0.2));
          background: var(--rialto-surface-raised-hover, rgba(255,255,255,0.1));
        }
        @media (max-width: 720px) {
          .step-floor-plan { flex-direction: column; min-height: 0; }
          .step-floor-plan > div:first-child { flex: 1 1 auto; border-right: none; border-bottom: 1px solid var(--rialto-border); }
          .step-floor-plan .preview-col { flex: 1 1 auto; }
        }
      `}</style>
    </motion.div>
  );
}
