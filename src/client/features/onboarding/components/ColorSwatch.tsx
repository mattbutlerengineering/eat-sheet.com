import { motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
}

const GOLD = "#c49a2a";

export function ColorSwatch({ color, selected, onClick }: ColorSwatchProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={spring}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: color,
        border: selected
          ? `2px solid ${GOLD}`
          : "2px solid transparent",
        boxShadow: selected
          ? "0 0 12px rgba(196,154,42,0.3)"
          : "none",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        outline: "none",
      }}
      aria-label={`Select color ${color}`}
      aria-pressed={selected}
    />
  );
}
