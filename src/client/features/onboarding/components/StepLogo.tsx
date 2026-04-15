import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { ColorSwatch } from "./ColorSwatch";

interface StepLogoProps {
  logoResult: { logoUrl: string; extractedColors: readonly string[] } | null;
  onUpload: (file: File) => Promise<void>;
}

const GOLD = "#c49a2a";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

const columnStyle: React.CSSProperties = {
  display: "flex",
  gap: 32,
  alignItems: "flex-start",
};

const leftColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const rightColumnStyle: React.CSSProperties = {
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
  minHeight: 140,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(232,226,216,0.35)",
  marginBottom: 10,
};

const emptyPreviewStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(232,226,216,0.2)",
  fontStyle: "italic",
  textAlign: "center",
};

const swatchRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 4,
};

function buildLogoSrc(logoUrl: string): string {
  // Strip "logos/" prefix if present, since the API route handles that
  const path = logoUrl.replace(/^logos\//, "");
  return `/api/onboarding/logos/${path}`;
}

export function StepLogo({ logoResult, onUpload }: StepLogoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only PNG, JPG, or SVG files are supported.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return "File must be under 2MB.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  const dropZoneStyle: React.CSSProperties = {
    padding: "48px 32px",
    borderRadius: 10,
    border: `2px dashed ${isDragOver ? GOLD : "rgba(232,226,216,0.2)"}`,
    background: isDragOver ? "rgba(196,154,42,0.04)" : "transparent",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.2s ease, background 0.2s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div style={columnStyle}>
      {/* Left: Drop zone */}
      <div style={leftColumnStyle}>
        <div
          style={dropZoneStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload logo"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            style={{ display: "none" }}
            onChange={handleInputChange}
          />

          {isUploading ? (
            <div style={{ color: "rgba(232,226,216,0.6)", fontSize: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: `2px solid rgba(232,226,216,0.2)`,
                  borderTop: `2px solid ${GOLD}`,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 10px",
                }}
              />
              Uploading...
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 15,
                  color: isDragOver ? GOLD : "rgba(232,226,216,0.7)",
                  fontWeight: 500,
                }}
              >
                Drag your logo here
              </div>
              <div style={{ fontSize: 12, color: "rgba(232,226,216,0.35)" }}>
                PNG, JPG, or SVG · Max 2MB
              </div>
            </>
          )}
        </div>

        {validationError && (
          <div
            style={{
              fontSize: 13,
              color: "#e07070",
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(224,112,112,0.08)",
              border: "1px solid rgba(224,112,112,0.2)",
            }}
          >
            {validationError}
          </div>
        )}

        {/* Extracted color swatches */}
        <AnimatePresence>
          {logoResult && logoResult.extractedColors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={spring}
            >
              <div style={previewLabelStyle}>Extracted colors</div>
              <div style={swatchRowStyle}>
                {logoResult.extractedColors.map((color, i) => (
                  <motion.div
                    key={color}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...spring, delay: i * 0.05 }}
                  >
                    <ColorSwatch
                      color={color}
                      selected={false}
                      onClick={() => {}}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Logo preview */}
      <div style={rightColumnStyle}>
        <div style={previewCardStyle}>
          {logoResult ? (
            <motion.img
              key={logoResult.logoUrl}
              src={buildLogoSrc(logoResult.logoUrl)}
              alt="Your logo"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
              style={{
                maxWidth: "100%",
                maxHeight: 120,
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          ) : (
            <div style={emptyPreviewStyle}>Your logo will appear here</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
