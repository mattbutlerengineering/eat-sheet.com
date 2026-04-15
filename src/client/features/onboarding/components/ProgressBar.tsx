import { motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

interface ProgressBarProps {
  readonly currentStep: number;
  readonly totalSteps?: number;
  readonly accent?: string | undefined;
}

const DEFAULT_ACCENT = "#c49a2a";
const FUTURE = "var(--rialto-border, rgba(232,226,216,0.15))";

export function ProgressBar({
  currentStep,
  totalSteps = 5,
  accent,
}: ProgressBarProps) {
  const activeColor = accent ?? DEFAULT_ACCENT;

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--rialto-space-sm, 8px)",
        alignItems: "center",
        transition: "gap 0.3s ease",
      }}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isActive = stepNumber <= currentStep;
        return (
          <motion.div
            key={stepNumber}
            animate={{ backgroundColor: isActive ? activeColor : FUTURE }}
            transition={spring}
            style={{
              width: 36,
              height: 4,
              borderRadius: "var(--rialto-radius-none, 2px)",
              boxShadow: isActive ? `0 0 6px ${activeColor}40` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
