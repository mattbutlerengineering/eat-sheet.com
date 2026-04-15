import { useState, useEffect } from "react";
import { ColorSwatch } from "./ColorSwatch";
import { ThemePreview } from "./ThemePreview";
import type { VenueBrandInput } from "@shared/schemas";

interface StepBrandProps {
  extractedColors: readonly string[];
  venueName: string;
  data: VenueBrandInput | null;
  onChange: (data: VenueBrandInput) => void;
}

const DEFAULT_ACCENT = "#c49a2a";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.round(rgb.r * (1 - amount)),
    Math.round(rgb.g * (1 - amount)),
    Math.round(rgb.b * (1 - amount)),
  );
}

const columnStyle: React.CSSProperties = {
  display: "flex",
  gap: 32,
  alignItems: "flex-start",
};

const leftColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const rightColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(232,226,216,0.4)",
  marginBottom: 10,
};

const swatchRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const colorPickerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const hexLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(232,226,216,0.6)",
  fontFamily: "var(--rialto-font-mono, monospace)",
  letterSpacing: "0.05em",
};

function buildBrand(accent: string, source: "extracted" | "manual"): VenueBrandInput {
  return {
    accent,
    accentHover: darken(accent, 0.15),
    surface: null,
    surfaceElevated: null,
    textPrimary: null,
    source,
  };
}

export function StepBrand({
  extractedColors,
  venueName,
  data,
  onChange,
}: StepBrandProps) {
  const [accent, setAccent] = useState(data?.accent ?? DEFAULT_ACCENT);

  const colors =
    extractedColors.length > 0 ? extractedColors : [DEFAULT_ACCENT];

  // Set initial brand data on mount so validation passes without requiring a click
  useEffect(() => {
    if (!data) {
      const source = extractedColors.length > 0 ? "extracted" : "manual";
      onChange(buildBrand(accent, source));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectColor(color: string, source: "extracted" | "manual") {
    setAccent(color);
    onChange(buildBrand(color, source));
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value;
    setAccent(color);
    onChange(buildBrand(color, "manual"));
  }

  return (
    <div style={columnStyle}>
      {/* Left: Color picker */}
      <div style={leftColumnStyle}>
        <div>
          <div style={sectionLabelStyle}>Choose your accent color</div>
          <div style={swatchRowStyle}>
            {colors.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={accent.toLowerCase() === color.toLowerCase()}
                onClick={() =>
                  selectColor(
                    color,
                    extractedColors.length > 0 ? "extracted" : "manual",
                  )
                }
              />
            ))}
          </div>
        </div>

        <div>
          <div style={sectionLabelStyle}>Custom color</div>
          <div style={colorPickerRowStyle}>
            <input
              type="color"
              value={accent}
              onChange={handlePickerChange}
              style={{
                width: 40,
                height: 40,
                padding: 2,
                borderRadius: 8,
                border: "1px solid rgba(232,226,216,0.2)",
                background: "transparent",
                cursor: "pointer",
              }}
              aria-label="Choose custom accent color"
            />
            <span style={hexLabelStyle}>{accent.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Right: Theme preview */}
      <div style={rightColumnStyle}>
        <ThemePreview
          accent={accent}
          venueName={venueName}
        />
      </div>
    </div>
  );
}
