import { useRef, useCallback } from "react";
import { Group, Rect, Circle, Text, Line } from "react-konva";
import type Konva from "konva";
import type { EditorTable } from "../types";

interface TableShapeProps {
  readonly table: EditorTable;
  readonly isSelected: boolean;
  readonly accentColor: string;
  readonly onSelect: (id: string) => void;
  readonly onDragEnd: (id: string, x: number, y: number) => void;
  readonly onTransformEnd: (
    id: string,
    width: number,
    height: number,
    rotation: number,
    x: number,
    y: number,
  ) => void;
}

// Chair dimensions
const CHAIR_W = 12;
const CHAIR_H = 10;
const CHAIR_R = 3;
const CHAIR_GAP = 4;
const CUSHION_INSET = 2;

// Place setting size
const PLATE_RADIUS = 5;
const PLATE_OFFSET = 6;

function getChairPositions(
  shape: string,
  width: number,
  height: number,
  maxCapacity: number,
): readonly {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}[] {
  const positions: { x: number; y: number; rotation: number }[] = [];
  const offset = CHAIR_H / 2 + CHAIR_GAP;

  if (shape === "circle") {
    const radius = width / 2;
    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < maxCapacity; i++) {
      const angle = (2 * Math.PI * i) / maxCapacity - Math.PI / 2;
      positions.push({
        x: cx + (radius + offset) * Math.cos(angle),
        y: cy + (radius + offset) * Math.sin(angle),
        rotation: (angle * 180) / Math.PI + 90,
      });
    }
  } else {
    const perimeter = 2 * (width + height);
    const step = perimeter / maxCapacity;

    for (let i = 0; i < maxCapacity; i++) {
      let d = step * i + step / 2;

      if (d < width) {
        positions.push({ x: d, y: -offset, rotation: 0 });
      } else if (d < width + height) {
        d -= width;
        positions.push({ x: width + offset, y: d, rotation: 90 });
      } else if (d < 2 * width + height) {
        d -= width + height;
        positions.push({ x: width - d, y: height + offset, rotation: 180 });
      } else {
        d -= 2 * width + height;
        positions.push({ x: -offset, y: height - d, rotation: 270 });
      }
    }
  }

  return positions;
}

function getPlatePositions(
  shape: string,
  width: number,
  height: number,
  maxCapacity: number,
): readonly { readonly x: number; readonly y: number }[] {
  const positions: { x: number; y: number }[] = [];

  if (shape === "circle") {
    const cx = width / 2;
    const cy = height / 2;
    const plateRing = width / 2 - PLATE_OFFSET - PLATE_RADIUS;
    if (plateRing < PLATE_RADIUS) return positions;
    for (let i = 0; i < maxCapacity; i++) {
      const angle = (2 * Math.PI * i) / maxCapacity - Math.PI / 2;
      positions.push({
        x: cx + plateRing * Math.cos(angle),
        y: cy + plateRing * Math.sin(angle),
      });
    }
  } else {
    const inset = PLATE_OFFSET + PLATE_RADIUS;
    const innerW = width - inset * 2;
    const innerH = height - inset * 2;
    if (innerW < 0 || innerH < 0) return positions;
    const perimeter = 2 * (innerW + innerH);
    const step = perimeter / maxCapacity;

    for (let i = 0; i < maxCapacity; i++) {
      let d = step * i + step / 2;
      if (d < innerW) {
        positions.push({ x: inset + d, y: inset });
      } else if (d < innerW + innerH) {
        d -= innerW;
        positions.push({ x: width - inset, y: inset + d });
      } else if (d < 2 * innerW + innerH) {
        d -= innerW + innerH;
        positions.push({ x: width - inset - d, y: height - inset });
      } else {
        d -= 2 * innerW + innerH;
        positions.push({ x: inset, y: height - inset - d });
      }
    }
  }

  return positions;
}

// Wood palette
const WOOD_BASE = "#8B7355";
const WOOD_DARK = "#7A6548";
const WOOD_LIGHT = "#9C8468";
const WOOD_GRAIN = "#806A4E";
const WOOD_STROKE = "#6B5740";

// Chair palette
const CHAIR_FRAME = "#4a3f32";
const CHAIR_FRAME_STROKE = "#3d3228";
const CHAIR_CUSHION = "#5c4f40";

export function TableShape({
  table,
  isSelected,
  accentColor,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: TableShapeProps) {
  const groupRef = useRef<Konva.Group>(null);

  const handleClick = useCallback(() => {
    onSelect(table.id);
  }, [onSelect, table.id]);

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEnd(table.id, e.target.x(), e.target.y());
    },
    [onDragEnd, table.id],
  );

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onTransformEnd(
      table.id,
      Math.max(20, node.width() * scaleX),
      Math.max(20, node.height() * scaleY),
      node.rotation(),
      node.x(),
      node.y(),
    );
  }, [onTransformEnd, table.id]);

  const chairPositions = getChairPositions(
    table.shape,
    table.width,
    table.height,
    table.maxCapacity,
  );

  const platePositions = getPlatePositions(
    table.shape,
    table.width,
    table.height,
    table.maxCapacity,
  );

  const labelFontSize = Math.max(10, Math.min(table.width, table.height) * 0.24);
  const cornerRadius = table.shape === "circle" ? 0 : table.shape === "square" ? 3 : 6;

  // Wood grain lines for texture
  const grainLines: React.ReactNode[] = [];
  if (table.shape !== "circle") {
    const grainSpacing = 8;
    for (let y = grainSpacing; y < table.height - 2; y += grainSpacing) {
      grainLines.push(
        <Line
          key={`grain-${y}`}
          points={[4, y, table.width - 4, y]}
          stroke={WOOD_GRAIN}
          strokeWidth={0.5}
          opacity={0.3}
          listening={false}
        />,
      );
    }
  }

  return (
    <Group
      ref={groupRef}
      id={table.id}
      x={table.x}
      y={table.y}
      width={table.width}
      height={table.height}
      rotation={table.rotation}
      draggable
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* Contact shadow — dark, tight, directly under furniture */}
      {table.shape === "circle" ? (
        <Circle
          x={table.width / 2}
          y={table.height / 2 + 2}
          radius={table.width / 2 + 3}
          fill="rgba(0,0,0,0.15)"
          listening={false}
        />
      ) : (
        <Rect
          x={-2}
          y={1}
          width={table.width + 4}
          height={table.height + 4}
          fill="rgba(0,0,0,0.15)"
          cornerRadius={cornerRadius + 2}
          listening={false}
        />
      )}

      {/* Chairs with cushion detail */}
      {chairPositions.map((pos, i) => (
        <Group key={`chair-${i}`} x={pos.x} y={pos.y} rotation={pos.rotation} listening={false}>
          {/* Chair frame */}
          <Rect
            x={-CHAIR_W / 2}
            y={-CHAIR_H / 2}
            width={CHAIR_W}
            height={CHAIR_H}
            cornerRadius={CHAIR_R}
            fill={CHAIR_FRAME}
            stroke={CHAIR_FRAME_STROKE}
            strokeWidth={0.5}
            shadowColor="#000000"
            shadowBlur={3}
            shadowOffsetY={1}
            shadowOpacity={0.2}
          />
          {/* Cushion */}
          <Rect
            x={-CHAIR_W / 2 + CUSHION_INSET}
            y={-CHAIR_H / 2 + CUSHION_INSET}
            width={CHAIR_W - CUSHION_INSET * 2}
            height={CHAIR_H - CUSHION_INSET * 2}
            cornerRadius={2}
            fill={CHAIR_CUSHION}
          />
        </Group>
      ))}

      {/* Table surface */}
      {table.shape === "circle" ? (
        <>
          <Circle
            x={table.width / 2}
            y={table.height / 2}
            radius={table.width / 2}
            fill={WOOD_BASE}
            stroke={isSelected ? accentColor : WOOD_STROKE}
            strokeWidth={isSelected ? 2 : 1}
            shadowColor="#000000"
            shadowBlur={isSelected ? 14 : 8}
            shadowOffsetY={isSelected ? 4 : 2}
            shadowOpacity={isSelected ? 0.45 : 0.3}
          />
          {/* Circular wood grain rings */}
          <Circle
            x={table.width / 2}
            y={table.height / 2}
            radius={table.width / 2 - 6}
            fill="transparent"
            stroke={WOOD_GRAIN}
            strokeWidth={0.5}
            opacity={0.25}
            listening={false}
          />
          <Circle
            x={table.width / 2}
            y={table.height / 2}
            radius={table.width / 2 - 12}
            fill="transparent"
            stroke={WOOD_GRAIN}
            strokeWidth={0.5}
            opacity={0.2}
            listening={false}
          />
          {/* Highlight — top-left light */}
          <Circle
            x={table.width / 2 - 2}
            y={table.height / 2 - 2}
            radius={table.width / 2 - 3}
            fill="transparent"
            stroke={WOOD_LIGHT}
            strokeWidth={0.8}
            opacity={0.3}
            listening={false}
          />
        </>
      ) : (
        <>
          <Rect
            width={table.width}
            height={table.height}
            fill={WOOD_BASE}
            stroke={isSelected ? accentColor : WOOD_STROKE}
            strokeWidth={isSelected ? 2 : 1}
            cornerRadius={cornerRadius}
            shadowColor="#000000"
            shadowBlur={isSelected ? 14 : 8}
            shadowOffsetY={isSelected ? 4 : 2}
            shadowOpacity={isSelected ? 0.45 : 0.3}
          />
          {/* Wood grain lines */}
          {grainLines}
          {/* Top edge highlight */}
          <Line
            points={[cornerRadius, 1.5, table.width - cornerRadius, 1.5]}
            stroke={WOOD_LIGHT}
            strokeWidth={1}
            opacity={0.35}
            listening={false}
          />
          {/* Left edge highlight */}
          <Line
            points={[1.5, cornerRadius, 1.5, table.height - cornerRadius]}
            stroke={WOOD_LIGHT}
            strokeWidth={0.5}
            opacity={0.2}
            listening={false}
          />
        </>
      )}

      {/* Place settings — small plates */}
      {platePositions.map((pos, i) => (
        <Group key={`plate-${i}`} listening={false}>
          <Circle
            x={pos.x}
            y={pos.y}
            radius={PLATE_RADIUS}
            fill="rgba(255,255,255,0.12)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={0.5}
          />
          <Circle
            x={pos.x}
            y={pos.y}
            radius={PLATE_RADIUS - 2}
            fill="transparent"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={0.3}
          />
        </Group>
      ))}

      {/* Label */}
      <Text
        text={table.label}
        x={0}
        y={0}
        width={table.width}
        height={table.height}
        align="center"
        verticalAlign="middle"
        fontSize={labelFontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontStyle="600"
        fill={isSelected ? "#fff" : "rgba(255,255,255,0.8)"}
        listening={false}
      />
    </Group>
  );
}
