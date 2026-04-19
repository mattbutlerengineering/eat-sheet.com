import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { useAuth } from "../hooks/useAuth";
import {
  GuestList,
  GuestDetail,
  GuestForm,
  useGuests,
  createGuestApi,
  updateGuestApi,
  deleteGuestApi,
} from "../features/guests";
import type { Guest } from "@shared/types/guest";
import type { CreateGuestInput } from "@shared/schemas/guest";

const ms = (s: React.CSSProperties): MotionStyle => s as MotionStyle;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--rialto-surface, #1e1c1a)",
  padding: "var(--rialto-space-xl, 20px) var(--rialto-space-2xl, 32px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--rialto-space-xl, 20px)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-2xl, 24px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
};

const backStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--rialto-text-secondary, #a09a92)",
  cursor: "pointer",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: React.CSSProperties = {
  background: "var(--rialto-surface-elevated, #2a2725)",
  borderRadius: "var(--rialto-radius-soft, 10px)",
  padding: "var(--rialto-space-xl, 20px)",
  width: 460,
  maxWidth: "90vw",
  maxHeight: "90vh",
  overflowY: "auto",
};

const modalTitleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-lg, 18px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
  marginBottom: "var(--rialto-space-lg, 16px)",
};

export function Guests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tenantId = user?.tenantId ?? "";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { guests, total, loading, refetch } = useGuests({
    tenantId,
    ...(search ? { q: search } : {}),
    page,
    limit: 50,
  });

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const handleAdd = async (data: CreateGuestInput) => {
    setSubmitting(true);
    try {
      await createGuestApi(tenantId, data);
      setShowAddForm(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: CreateGuestInput) => {
    if (!selectedGuest) return;
    await updateGuestApi(tenantId, selectedGuest.id, data);
    refetch();
    setSelectedGuest(null);
  };

  const handleDelete = async () => {
    if (!selectedGuest) return;
    await deleteGuestApi(tenantId, selectedGuest.id);
    refetch();
    setSelectedGuest(null);
  };

  if (!tenantId) {
    navigate("/onboarding");
    return null;
  }

  return (
    <div style={pageStyle} data-theme="dark">
      <main id="main-content">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1 }}
        >
          <motion.div variants={fadeUp} style={ms(headerStyle)}>
            <h1 style={titleStyle}>Guests</h1>
            <button style={backStyle} onClick={() => navigate("/")}>
              &larr; Dashboard
            </button>
          </motion.div>

          <motion.div variants={fadeUp}>
            <GuestList
              guests={guests}
              total={total}
              page={page}
              limit={50}
              loading={loading}
              search={search}
              onSearchChange={handleSearchChange}
              onPageChange={setPage}
              onSelect={setSelectedGuest}
              onAdd={() => setShowAddForm(true)}
            />
          </motion.div>
        </motion.div>
      </main>

      <AnimatePresence>
        {selectedGuest && (
          <GuestDetail
            guest={selectedGuest}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelectedGuest(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            style={ms(modalOverlayStyle)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              style={ms(modalStyle)}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={modalTitleStyle}>Add Guest</h2>
              <GuestForm
                onSubmit={handleAdd}
                onCancel={() => setShowAddForm(false)}
                submitting={submitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
