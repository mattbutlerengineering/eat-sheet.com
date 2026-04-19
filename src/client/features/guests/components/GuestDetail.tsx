import { useState } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import type { Guest } from "@shared/types/guest";
import type { CreateGuestInput } from "@shared/schemas/guest";
import { GuestForm } from "./GuestForm";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

interface GuestDetailProps {
  readonly guest: Guest;
  readonly onUpdate: (data: CreateGuestInput) => Promise<void>;
  readonly onDelete: () => Promise<void>;
  readonly onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 100,
  display: "flex",
  justifyContent: "flex-end",
};

const drawerStyle: React.CSSProperties = {
  width: 420,
  maxWidth: "100vw",
  background: "var(--rialto-surface-elevated, #2a2725)",
  borderLeft: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  padding: "var(--rialto-space-xl, 20px)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-lg, 16px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-xl, 20px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const closeStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--rialto-text-secondary, #a09a92)",
  cursor: "pointer",
  fontSize: "var(--rialto-text-lg, 18px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const actionButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  color: "var(--rialto-text-primary, #e8e2d8)",
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-lg, 16px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  cursor: "pointer",
};

const deleteStyle: React.CSSProperties = {
  ...actionButtonStyle,
  borderColor: "rgba(220,60,60,0.4)",
  color: "#dc3c3c",
  marginTop: "var(--rialto-space-lg, 16px)",
};

const statRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-xl, 20px)",
};

const statStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const statLabelStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  color: "var(--rialto-text-secondary, #a09a92)",
  textTransform: "uppercase" as const,
  letterSpacing: "var(--rialto-tracking-wide, 0.05em)",
};

const statValueStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-md, 16px)",
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const tagContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--rialto-space-xs, 4px)",
};

const tagStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  padding: "2px 8px",
  borderRadius: "var(--rialto-radius-pill, 999px)",
  background: "rgba(196,154,42,0.15)",
  color: "var(--rialto-accent, #c49a2a)",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  margin: "var(--rialto-space-sm, 10px) 0",
};

export function GuestDetail({ guest, onUpdate, onDelete, onClose }: GuestDetailProps) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpdate = async (data: CreateGuestInput) => {
    setSubmitting(true);
    try {
      await onUpdate(data);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${guest.name}?`)) return;
    setSubmitting(true);
    try {
      await onDelete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <motion.div
        style={ms(drawerStyle)}
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={headerStyle}>
          <h2 style={titleStyle}>{guest.name}</h2>
          <button style={closeStyle} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {guest.tags.length > 0 && (
          <div style={tagContainerStyle}>
            {guest.tags.map((t) => (
              <span key={t} style={tagStyle}>{t}</span>
            ))}
          </div>
        )}

        <div style={statRowStyle}>
          <div style={statStyle}>
            <span style={statLabelStyle}>Visits</span>
            <span style={statValueStyle}>{guest.visitCount}</span>
          </div>
          <div style={statStyle}>
            <span style={statLabelStyle}>Last Visit</span>
            <span style={statValueStyle}>
              {guest.lastVisitAt
                ? new Date(guest.lastVisitAt).toLocaleDateString()
                : "Never"}
            </span>
          </div>
        </div>

        <div style={dividerStyle} aria-hidden="true" />

        {editing ? (
          <GuestForm
            guest={guest}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitting={submitting}
          />
        ) : (
          <>
            <button
              style={actionButtonStyle}
              onClick={() => setEditing(true)}
            >
              Edit Guest
            </button>
            <button style={deleteStyle} onClick={handleDelete} disabled={submitting}>
              Delete Guest
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
