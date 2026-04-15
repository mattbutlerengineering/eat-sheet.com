import { motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

interface ColorSwatchProps {
  readonly color: string;
  readonly selected: boolean;
  readonly onClick: () => void;
}

export function ColorSwatch({ color, selected, onClick }: ColorSwatchProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        boxShadow: selected
          ? `0 0 0 2px var(--rialto-surface, #1e1c1a), 0 0 0 4px ${color}`
          : "0 0 0 2px transparent, 0 0 0 4px transparent",
      }}
      transition={spring}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: color,
        border: "none",
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
