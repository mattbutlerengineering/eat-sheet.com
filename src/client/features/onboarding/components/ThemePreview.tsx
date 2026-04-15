interface ThemePreviewProps {
  accent: string;
  accentHover: string;
  venueName: string;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(232,226,216,0.04)",
  borderRadius: 10,
  border: "1px solid rgba(232,226,216,0.08)",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(232,226,216,0.35)",
  marginBottom: 2,
};

const venueBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 10px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#1a1714",
  letterSpacing: "0.01em",
};

const inputPreviewStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  background: "rgba(232,226,216,0.06)",
  border: "1px solid rgba(232,226,216,0.15)",
  color: "rgba(232,226,216,0.5)",
  fontSize: 13,
  boxSizing: "border-box",
  cursor: "default",
  outline: "none",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid rgba(232,226,216,0.2)",
  background: "transparent",
  color: "rgba(232,226,216,0.6)",
  fontSize: 13,
  cursor: "default",
};

export function ThemePreview({ accent, accentHover: _accentHover, venueName }: ThemePreviewProps) {
  const confirmButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    background: accent,
    color: "#1a1714",
    fontSize: 13,
    fontWeight: 600,
    cursor: "default",
    boxShadow: `0 2px 8px ${accent}44`,
  };

  return (
    <div style={cardStyle}>
      <div style={previewLabelStyle}>Live preview</div>

      {/* Venue name badge */}
      <div
        style={{
          ...venueBadgeStyle,
          background: accent,
        }}
      >
        {venueName || "Your Venue"}
      </div>

      {/* Sample input */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(232,226,216,0.35)",
            marginBottom: 4,
            letterSpacing: "0.08em",
          }}
        >
          Sample field
        </div>
        <input
          readOnly
          tabIndex={-1}
          style={{
            ...inputPreviewStyle,
            borderColor: accent + "66",
          }}
          value="Guest name..."
        />
      </div>

      {/* Confirm / Cancel */}
      <div style={buttonRowStyle}>
        <button type="button" tabIndex={-1} style={cancelButtonStyle}>
          Cancel
        </button>
        <button type="button" tabIndex={-1} style={confirmButtonStyle}>
          Confirm
        </button>
      </div>
    </div>
  );
}
