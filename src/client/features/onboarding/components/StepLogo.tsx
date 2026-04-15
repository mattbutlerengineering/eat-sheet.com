import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { ColorSwatch } from "./ColorSwatch";

interface StepLogoProps {
  logoResult: { logoUrl: string; extractedColors: readonly string[] } | null;
  uploadError: string | null;
  onUpload: (file: File) => Promise<void>;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

const columnStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-2xl, 32px)",
  alignItems: "flex-start",
};

const leftColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-lg, 16px)",
};

const rightColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-md, 12px)",
};

const previewCardStyle: React.CSSProperties = {
  background: "var(--rialto-surface-elevated, rgba(232,226,216,0.04))",
  borderRadius: "var(--rialto-radius-soft, 10px)",
  border: "1px solid var(--rialto-border, rgba(232,226,216,0.08))",
  padding: "var(--rialto-space-lg, 16px) var(--rialto-space-xl, 20px)",
  minHeight: 140,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 11px)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.35))",
  marginBottom: "var(--rialto-space-sm, 10px)",
};

const emptyPreviewStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-sm, 13px)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.2))",
  fontStyle: "italic",
  textAlign: "center",
};

const swatchRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--rialto-space-sm, 10px)",
  marginTop: "var(--rialto-space-xs, 4px)",
};

export function StepLogo({ logoResult, uploadError, onUpload }: StepLogoProps) {
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
    padding: "48px var(--rialto-space-2xl, 32px)",
    borderRadius: "var(--rialto-radius-soft, 10px)",
    border: `2px dashed ${isDragOver ? "var(--rialto-accent, #c49a2a)" : "var(--rialto-border-strong, rgba(232,226,216,0.2))"}`,
    background: isDragOver ? "color-mix(in srgb, var(--rialto-accent, #c49a2a) 4%, transparent)" : "transparent",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.2s ease, background 0.2s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--rialto-space-xs, 8px)",
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
            <div style={{ color: "var(--rialto-text-secondary, rgba(232,226,216,0.6))", fontSize: "var(--rialto-text-sm, 14px)" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "2px solid var(--rialto-border-strong, rgba(232,226,216,0.2))",
                  borderTop: "2px solid var(--rialto-accent, #c49a2a)",
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
                  fontSize: "var(--rialto-text-md, 15px)",
                  color: isDragOver ? "var(--rialto-accent, #c49a2a)" : "var(--rialto-text-secondary, rgba(232,226,216,0.7))",
                  fontWeight: "var(--rialto-weight-medium, 500)" as React.CSSProperties["fontWeight"],
                }}
              >
                Drag your logo here
              </div>
              <div style={{ fontSize: "var(--rialto-text-sm, 13px)", color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))" }}>
                or click to browse
              </div>
              <div style={{ fontSize: "var(--rialto-text-xs, 12px)", color: "var(--rialto-text-tertiary, rgba(232,226,216,0.25))", marginTop: "var(--rialto-space-xs, 4px)" }}>
                PNG, JPG, or SVG · Max 2MB
              </div>
            </>
          )}
        </div>

        {(validationError || uploadError) && (
          <div
            style={{
              fontSize: "var(--rialto-text-sm, 13px)",
              color: "var(--rialto-error, #e07070)",
              padding: "var(--rialto-space-xs, 8px) var(--rialto-space-sm, 12px)",
              borderRadius: "var(--rialto-radius-default, 6px)",
              background: "var(--rialto-error-muted, rgba(224,112,112,0.08))",
              border: "1px solid var(--rialto-error, rgba(224,112,112,0.2))",
            }}
          >
            {validationError ?? uploadError}
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
              src={logoResult.logoUrl}
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
