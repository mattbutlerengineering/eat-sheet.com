import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { Input, Select, AnimatedTag, TagGroup } from "@mattbutlerengineering/rialto";
import { CUISINE_OPTIONS, VENUE_TYPES, VENUE_TYPE_LABELS } from "@shared/types";
import type { VenueType } from "@shared/types";
import type { VenueInfoInput } from "@shared/schemas";

interface StepVenueInfoProps {
  data: VenueInfoInput | null;
  onChange: (data: VenueInfoInput) => void;
}

const VENUE_TYPE_OPTIONS = VENUE_TYPES.map((t) => ({
  value: t,
  label: VENUE_TYPE_LABELS[t],
}));

const CUISINE_SELECT_OPTIONS = CUISINE_OPTIONS.map((c) => ({
  value: c,
  label: c,
}));

const columnStyle: React.CSSProperties = {
  display: "flex",
  gap: 32,
  alignItems: "flex-start",
};

const formColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const previewColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const previewCardStyle: React.CSSProperties = {
  background: "rgba(232,226,216,0.04)",
  borderRadius: 10,
  border: "1px solid rgba(232,226,216,0.08)",
  padding: "16px 20px",
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(232,226,216,0.35)",
  marginBottom: 10,
};

const appBarPreviewStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const logoSquareStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: "var(--rialto-accent, #c49a2a)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const logoLetterStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#1a1714",
  fontFamily: "var(--rialto-font-display, system-ui)",
  lineHeight: 1,
};

const venueNamePreviewStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: 15,
  fontWeight: 400,
  color: "#e8e2d8",
  letterSpacing: "-0.01em",
};

const placeholderNameStyle: React.CSSProperties = {
  ...venueNamePreviewStyle,
  color: "rgba(232,226,216,0.25)",
  fontStyle: "italic",
};

const tagRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  minHeight: 32,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(232,226,216,0.4)",
  marginBottom: 4,
};

export function StepVenueInfo({ data, onChange }: StepVenueInfoProps) {
  const [name, setName] = useState(data?.name ?? "");
  const [type, setType] = useState<string>(data?.type ?? "");
  const [cuisines, setCuisines] = useState<string[]>(data?.cuisines ?? []);
  const [selectedCuisine, setSelectedCuisine] = useState("");

  function emit(
    nextName: string,
    nextType: string,
    nextCuisines: string[],
  ) {
    onChange({
      name: nextName,
      type: nextType as VenueType,
      cuisines: nextCuisines,
    });
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    emit(val, type, cuisines);
  }

  function handleTypeChange(val: string) {
    setType(val);
    emit(name, val, cuisines);
  }

  function handleAddCuisine(val: string) {
    if (!val || cuisines.includes(val)) return;
    const next = [...cuisines, val];
    setCuisines(next);
    setSelectedCuisine("");
    emit(name, type, next);
  }

  function handleRemoveCuisine(cuisine: string) {
    const next = cuisines.filter((c) => c !== cuisine);
    setCuisines(next);
    emit(name, type, next);
  }

  const availableCuisines = CUISINE_SELECT_OPTIONS.filter(
    (opt) => !cuisines.includes(opt.value),
  );

  const firstLetter = name.trim().charAt(0).toUpperCase();

  return (
    <div style={columnStyle}>
      {/* Left: Form */}
      <div style={formColumnStyle}>
        <Input
          label="Venue name"
          placeholder="e.g. Verde Kitchen"
          value={name}
          onChange={handleNameChange}
        />

        <Select
          label="Venue type"
          options={VENUE_TYPE_OPTIONS}
          value={type}
          onChange={handleTypeChange}
          placeholder="Select a type"
        />

        <div>
          <div style={sectionLabelStyle}>Cuisines</div>
          <Select
            options={availableCuisines}
            value={selectedCuisine}
            onChange={handleAddCuisine}
            placeholder="Add a cuisine..."
          />

          {cuisines.length > 0 && (
            <div style={{ ...tagRowStyle, marginTop: 10 }}>
              <TagGroup>
                <AnimatePresence>
                  {cuisines.map((c, i) => (
                    <motion.div
                      key={c}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ ...spring, delay: i * 0.05 }}
                    >
                      <AnimatedTag
                        id={c}
                        variant="accent"
                        dismissible
                        onDismiss={() => handleRemoveCuisine(c)}
                      >
                        {c}
                      </AnimatedTag>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </TagGroup>
            </div>
          )}
        </div>
      </div>

      {/* Right: Preview */}
      <div style={previewColumnStyle}>
        <div style={previewCardStyle}>
          <div style={previewLabelStyle}>Live preview</div>
          <div style={appBarPreviewStyle}>
            <div style={logoSquareStyle}>
              {firstLetter ? (
                <span style={logoLetterStyle}>{firstLetter}</span>
              ) : (
                <span style={{ ...logoLetterStyle, color: "rgba(26,23,20,0.5)" }}>
                  V
                </span>
              )}
            </div>
            {name.trim() ? (
              <span style={venueNamePreviewStyle}>{name}</span>
            ) : (
              <span style={placeholderNameStyle}>Your venue name</span>
            )}
          </div>
        </div>

        {type && (
          <div style={previewCardStyle}>
            <div style={previewLabelStyle}>Venue type</div>
            <span
              style={{
                fontSize: 14,
                color: "var(--rialto-accent, #c49a2a)",
              }}
            >
              {VENUE_TYPE_LABELS[type as VenueType] ?? type}
            </span>
          </div>
        )}

        {cuisines.length > 0 && (
          <div style={previewCardStyle}>
            <div style={previewLabelStyle}>Cuisines ({cuisines.length})</div>
            <div style={{ fontSize: 13, color: "rgba(232,226,216,0.6)", lineHeight: 1.6 }}>
              {cuisines.join(" · ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
