import { Rect, Circle } from "react-konva";
import { useMemo } from "react";

interface CanvasGridProps {
  readonly width: number;
  readonly height: number;
  readonly spacing?: number | undefined;
  readonly floorTexture?: HTMLImageElement | undefined;
}

export function CanvasGrid({ width, height, spacing = 40, floorTexture }: CanvasGridProps) {
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

  return (
    <>
      {/* Floor surface */}
      {floorTexture ? (
        <Rect x={0} y={0} width={width} height={height}
          fillPatternImage={floorTexture}
          fillPatternRepeat="repeat"
          stroke="#b8b2a8" strokeWidth={2} cornerRadius={2}
          shadowColor="#000000" shadowBlur={24} shadowOffsetY={0} shadowOpacity={0.4}
          listening={false} />
      ) : (
        <Rect x={0} y={0} width={width} height={height}
          fill="#d4cfc8"
          stroke="#b8b2a8" strokeWidth={2} cornerRadius={2}
          shadowColor="#000000" shadowBlur={24} shadowOffsetY={0} shadowOpacity={0.4}
          listening={false} />
      )}
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
      {/* Grid dots */}
      {dots}
    </>
  );
}
