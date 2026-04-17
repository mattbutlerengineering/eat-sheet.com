import { useCallback } from "react";
import { Line, Group } from "react-konva";
import type Konva from "konva";
import type { EditorWall } from "../types";

interface WallShapeProps {
  readonly wall: EditorWall;
  readonly isSelected: boolean;
  readonly accentColor: string;
  readonly onSelect: (id: string) => void;
}

// Wall colors
const WALL_FACE = "#3d3530";
const WALL_TOP = "#524a42";

// Window colors — glass effect
const WINDOW_GLASS = "rgba(140,200,220,0.35)";
const WINDOW_FRAME = "#6a7d85";
const WINDOW_HIGHLIGHT = "rgba(200,230,245,0.25)";

const DEPTH_X = -2;
const DEPTH_Y = -3;

export function WallShape({
  wall,
  isSelected,
  accentColor,
  onSelect,
}: WallShapeProps) {
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      onSelect(wall.id);
    },
    [onSelect, wall.id],
  );

  const isWindow = wall.wallType === "window";
  const halfT = wall.thickness / 2;

  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const nx = (-dy / len) * halfT;
  const ny = (dx / len) * halfT;

  // Four corners of base
  const b1x = wall.x1 + nx;
  const b1y = wall.y1 + ny;
  const b2x = wall.x2 + nx;
  const b2y = wall.y2 + ny;
  const b3x = wall.x2 - nx;
  const b3y = wall.y2 - ny;
  const b4x = wall.x1 - nx;
  const b4y = wall.y1 - ny;

  // Top face offset
  const t1x = b1x + DEPTH_X;
  const t1y = b1y + DEPTH_Y;
  const t2x = b2x + DEPTH_X;
  const t2y = b2y + DEPTH_Y;
  const t3x = b3x + DEPTH_X;
  const t3y = b3y + DEPTH_Y;
  const t4x = b4x + DEPTH_X;
  const t4y = b4y + DEPTH_Y;

  if (isWindow) {
    return (
      <Group>
        {/* Shadow */}
        <Line
          points={[wall.x1, wall.y1 + 2, wall.x2, wall.y2 + 2]}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={wall.thickness + 2}
          lineCap="square"
          listening={false}
        />
        {/* Glass pane */}
        <Line
          points={[b1x, b1y, b2x, b2y, b3x, b3y, b4x, b4y]}
          fill={isSelected ? `${accentColor}44` : WINDOW_GLASS}
          stroke={isSelected ? accentColor : WINDOW_FRAME}
          strokeWidth={isSelected ? 2 : 1}
          closed
          hitStrokeWidth={wall.thickness + 10}
          onClick={handleClick}
          onTap={handleClick}
        />
        {/* Glass highlight — reflection line */}
        <Line
          points={[
            wall.x1 + dx * 0.15,
            wall.y1 + dy * 0.15 - 1,
            wall.x1 + dx * 0.85,
            wall.y1 + dy * 0.85 - 1,
          ]}
          stroke={WINDOW_HIGHLIGHT}
          strokeWidth={1.5}
          lineCap="round"
          listening={false}
        />
        {/* Frame lines — thin borders at each end */}
        <Line
          points={[b1x, b1y, b4x, b4y]}
          stroke={WINDOW_FRAME}
          strokeWidth={1.5}
          listening={false}
        />
        <Line
          points={[b2x, b2y, b3x, b3y]}
          stroke={WINDOW_FRAME}
          strokeWidth={1.5}
          listening={false}
        />
      </Group>
    );
  }

  // Regular wall with 3D top face
  return (
    <Group>
      {/* Shadow */}
      <Line
        points={[wall.x1, wall.y1 + 3, wall.x2, wall.y2 + 3]}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={wall.thickness + 4}
        lineCap="square"
        listening={false}
      />
      {/* Front face */}
      <Line
        points={[b1x, b1y, b2x, b2y, b3x, b3y, b4x, b4y]}
        fill={isSelected ? accentColor : WALL_FACE}
        stroke={isSelected ? accentColor : WALL_FACE}
        strokeWidth={0.5}
        closed
        hitStrokeWidth={wall.thickness + 10}
        onClick={handleClick}
        onTap={handleClick}
      />
      {/* Top face */}
      <Line
        points={[t1x, t1y, t2x, t2y, t3x, t3y, t4x, t4y]}
        fill={isSelected ? `${accentColor}cc` : WALL_TOP}
        stroke={isSelected ? accentColor : WALL_TOP}
        strokeWidth={0.5}
        closed
        listening={false}
      />
      {/* Side edges */}
      <Line points={[b1x, b1y, t1x, t1y]} stroke={WALL_TOP} strokeWidth={0.5} listening={false} />
      <Line points={[b2x, b2y, t2x, t2y]} stroke={WALL_TOP} strokeWidth={0.5} listening={false} />
    </Group>
  );
}
