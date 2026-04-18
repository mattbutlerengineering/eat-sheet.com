import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

export interface DeleteVenueDialogProps {
  readonly venueName: string;
  readonly tenantId: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onDeleted: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "var(--rialto-space-xl, 20px)",
};

const cardStyle: React.CSSProperties = {
  background: "var(--rialto-surface, #1e1c1a)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  borderRadius: "var(--rialto-radius-soft, 12px)",
  padding: "var(--rialto-space-2xl, 28px)",
  width: "100%",
  maxWidth: 440,
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-xl, 20px)",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-xl, 20px)",
  fontWeight: 400,
  color: "var(--rialto-text-primary, #e8e2d8)",
  margin: 0,
  letterSpacing: "-0.01em",
};

const warningTextStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
  lineHeight: 1.6,
  margin: 0,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
  marginBottom: "var(--rialto-space-xs, 6px)",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--rialto-surface-recessed, rgba(232,226,216,0.04))",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  padding: "10px 12px",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  color: "var(--rialto-text-primary, #e8e2d8)",
  outline: "none",
  boxSizing: "border-box",
};

const inputFocusStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "rgba(255,255,255,0.25)",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-sm, 8px)",
  justifyContent: "flex-end",
};

const cancelButtonStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.5))",
  background: "transparent",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  padding: "8px 16px",
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 13px)",
  color: "#fff",
  background: "#c0392b",
  border: "none",
  borderRadius: "var(--rialto-radius-sharp, 6px)",
  padding: "8px 16px",
  cursor: "pointer",
};

const deleteButtonDisabledStyle: React.CSSProperties = {
  ...deleteButtonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  color: "var(--rialto-error, #e07070)",
};

export function DeleteVenueDialog({
  venueName,
  tenantId,
  open,
  onClose,
  onDeleted,
}: DeleteVenueDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const confirmed = confirmText === venueName;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) return;
    setConfirmText("");
    setError(null);
    setLoading(false);
    // Focus the input after animation
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [open]);

  // Escape key closes dialog
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  const handleDelete = useCallback(async () => {
    if (!confirmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/t/${tenantId}/venue`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json() as { ok: boolean; error?: string };
      if (body.ok) {
        onDeleted();
      } else {
        setError(body.error ?? "Failed to delete venue");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }, [confirmed, loading, tenantId, onDeleted]);

  const handleConfirmTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value),
    [],
  );
  const handleInputFocus = useCallback(() => setInputFocused(true), []);
  const handleInputBlur = useCallback(() => setInputFocused(false), []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={ms(overlayStyle)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) onClose();
          }}
        >
          <motion.div
            style={ms({ ...cardStyle })}
            data-theme="dark"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={spring}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-venue-heading"
          >
            <h2 id="delete-venue-heading" style={headingStyle}>
              Delete {venueName}?
            </h2>

            <p style={warningTextStyle}>
              This will permanently delete your venue, including all floor plans,
              tables, and settings. This action cannot be undone.
            </p>

            <div>
              <label htmlFor="confirm-venue-name" style={labelStyle}>
                Type the venue name to confirm
              </label>
              <input
                ref={inputRef}
                id="confirm-venue-name"
                type="text"
                value={confirmText}
                onChange={handleConfirmTextChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                style={inputFocused ? inputFocusStyle : inputStyle}
                placeholder={venueName}
                disabled={loading}
                autoComplete="off"
              />
            </div>

            {error && (
              <div role="alert" style={errorStyle}>
                {error}
              </div>
            )}

            <div style={buttonRowStyle}>
              <button
                type="button"
                style={cancelButtonStyle}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                style={confirmed && !loading ? deleteButtonStyle : deleteButtonDisabledStyle}
                onClick={handleDelete}
                disabled={!confirmed || loading}
                aria-disabled={!confirmed || loading}
              >
                {loading ? "Deleting…" : "Delete Venue"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
