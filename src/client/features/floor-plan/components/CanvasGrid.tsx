import { Rect, Circle } from "react-konva";
import { useMemo } from "react";

interface CanvasGridProps {
  readonly width: number;
  readonly height: number;
  readonly spacing?: number | undefined;
}

// Deterministic pseudo-random for floor speckles (seeded by position)
function seededRandom(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function CanvasGrid({ width, height, spacing = 40 }: CanvasGridProps) {
  const dots = useMemo(() => {
    const d: React.ReactNode[] = [];
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        d.push(
          <Circle
            key={`${x}-${y}`}
            x={x}
            y={y}
            radius={1}
            fill="rgba(0,0,0,0.06)"
            listening={false}
          />,
        );
      }
    }
    return d;
  }, [width, height, spacing]);

  // Floor texture speckles — subtle concrete feel
  const speckles = useMemo(() => {
    const s: React.ReactNode[] = [];
    const speckleSpacing = 20;
    for (let x = 10; x < width; x += speckleSpacing) {
      for (let y = 10; y < height; y += speckleSpacing) {
        const r = seededRandom(x, y);
        if (r > 0.6) {
          const offsetX = (seededRandom(x + 1, y) - 0.5) * 12;
          const offsetY = (seededRandom(x, y + 1) - 0.5) * 12;
          const size = 0.5 + r * 1.5;
          const opacity = 0.02 + r * 0.04;
          s.push(
            <Circle
              key={`sp-${x}-${y}`}
              x={x + offsetX}
              y={y + offsetY}
              radius={size}
              fill={r > 0.8 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}
              opacity={opacity}
              listening={false}
            />,
          );
        }
      }
    }
    return s;
  }, [width, height]);

  return (
    <>
      {/* Floor surface */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#d4cfc8"
        stroke="#b8b2a8"
        strokeWidth={2}
        cornerRadius={2}
        shadowColor="#000000"
        shadowBlur={24}
        shadowOffsetY={0}
        shadowOpacity={0.4}
        listening={false}
      />
      {/* Inner edge highlight */}
      <Rect
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
        fill="transparent"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        cornerRadius={1}
        listening={false}
      />
      {/* Concrete texture speckles */}
      {speckles}
      {/* Grid dots */}
      {dots}
    </>
  );
}
