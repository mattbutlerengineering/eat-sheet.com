import { useState, useEffect } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { Input } from "@mattbutlerengineering/rialto";
import type { Guest } from "@shared/types/guest";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface GuestListProps {
  readonly guests: readonly Guest[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly loading: boolean;
  readonly search: string;
  readonly onSearchChange: (q: string) => void;
  readonly onPageChange: (page: number) => void;
  readonly onSelect: (guest: Guest) => void;
  readonly onAdd: () => void;
}

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-md, 16px)",
  alignItems: "center",
  marginBottom: "var(--rialto-space-lg, 16px)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 16px)",
  borderBottom: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  color: "var(--rialto-text-secondary, #a09a92)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  fontSize: "var(--rialto-text-xs, 12px)",
  textTransform: "uppercase" as const,
  letterSpacing: "var(--rialto-tracking-wide, 0.05em)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 16px)",
  borderBottom: "1px solid var(--rialto-border, rgba(255,255,255,0.06))",
  color: "var(--rialto-text-primary, #e8e2d8)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const rowHoverStyle: React.CSSProperties = {
  cursor: "pointer",
};

const tagStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 12px)",
  padding: "2px 8px",
  borderRadius: "var(--rialto-radius-pill, 999px)",
  background: "rgba(196,154,42,0.15)",
  color: "var(--rialto-accent, #c49a2a)",
  marginRight: 4,
};

const addButtonStyle: React.CSSProperties = {
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-lg, 16px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  background: "var(--rialto-accent, #c49a2a)",
  color: "var(--rialto-text-on-accent, #1a1918)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const paginationStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "var(--rialto-space-md, 16px) 0",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  color: "var(--rialto-text-secondary, #a09a92)",
};

const pageButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  color: "var(--rialto-text-primary, #e8e2d8)",
  padding: "var(--rialto-space-xs, 4px) var(--rialto-space-sm, 10px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  cursor: "pointer",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "var(--rialto-space-2xl, 32px)",
  color: "var(--rialto-text-secondary, #a09a92)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-md, 16px)",
};

export function GuestList({
  guests,
  total,
  page,
  limit,
  loading,
  search,
  onSearchChange,
  onPageChange,
  onSelect,
  onAdd,
}: GuestListProps) {
  const [searchInput, setSearchInput] = useState(search);
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  return (
    <div>
      <div style={toolbarStyle}>
        <div style={{ flex: 1 }}>
          <Input
            label="Search guests"
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or phone..."
          />
        </div>
        <button style={addButtonStyle} onClick={onAdd}>
          + Add Guest
        </button>
      </div>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : guests.length === 0 ? (
        <div style={emptyStyle}>
          {search ? "No guests match your search" : "No guests yet"}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.03 }}
        >
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Tags</th>
                <th style={thStyle}>Visits</th>
                <th style={thStyle}>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <motion.tr
                  key={guest.id}
                  variants={fadeUp}
                  style={ms(rowHoverStyle)}
                  onClick={() => onSelect(guest)}
                >
                  <td style={tdStyle}>{guest.name}</td>
                  <td style={{ ...tdStyle, color: "var(--rialto-text-secondary, #a09a92)" }}>
                    {guest.email || "\u2014"}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--rialto-text-secondary, #a09a92)" }}>
                    {guest.phone || "\u2014"}
                  </td>
                  <td style={tdStyle}>
                    {guest.tags.map((t) => (
                      <span key={t} style={tagStyle}>{t}</span>
                    ))}
                  </td>
                  <td style={tdStyle}>{guest.visitCount}</td>
                  <td style={{ ...tdStyle, color: "var(--rialto-text-secondary, #a09a92)" }}>
                    {guest.lastVisitAt
                      ? new Date(guest.lastVisitAt).toLocaleDateString()
                      : "\u2014"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {totalPages > 1 && (
        <div style={paginationStyle}>
          <span>
            {total} guest{total !== 1 ? "s" : ""} &middot; Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "var(--rialto-space-xs, 4px)" }}>
            <button
              style={pageButtonStyle}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </button>
            <button
              style={pageButtonStyle}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
