import { motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  accent?: string | undefined;
}

const DEFAULT_ACCENT = "#c49a2a";
const FUTURE = "rgba(232,226,216,0.15)";
const BAR_WIDTH = 32;
const BAR_HEIGHT = 3;
const BAR_RADIUS = 2;
const GAP = 8;

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
        gap: GAP,
        alignItems: "center",
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
              width: BAR_WIDTH,
              height: BAR_HEIGHT,
              borderRadius: BAR_RADIUS,
            }}
          />
        );
      })}
    </div>
  );
}
