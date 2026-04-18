import { useRef, useCallback } from "react";
import { Group, Rect, Circle, Text, Image } from "react-konva";
import type Konva from "konva";
import type { EditorTable } from "../types";
import type { TextureMap } from "../hooks/useTextures";

interface TableShapeProps {
  readonly table: EditorTable;
  readonly isSelected: boolean;
  readonly accentColor: string;
  readonly textures: TextureMap;
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

export function TableShape({
  table,
  isSelected,
  accentColor,
  textures,
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

  const tableImageKey = table.shape === "circle" ? "table-round"
    : table.shape === "square" ? "table-square" : "table-rect";
  const tableImage = textures[tableImageKey];
  const chairImage = textures["chair"];
  const plateImage = textures["place-setting"];

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

      {/* Chairs — SVG image per position */}
      {chairImage && chairPositions.map((pos, i) => (
        <Image
          key={`chair-${i}`}
          image={chairImage}
          x={pos.x - 6}
          y={pos.y - 5}
          width={12}
          height={10}
          rotation={pos.rotation}
          listening={false}
        />
      ))}

      {/* Table surface — SVG image */}
      {tableImage && (
        <Image
          image={tableImage}
          x={0}
          y={0}
          width={table.width}
          height={table.height}
          shadowColor="#000000"
          shadowBlur={isSelected ? 14 : 8}
          shadowOffsetY={isSelected ? 4 : 2}
          shadowOpacity={isSelected ? 0.45 : 0.3}
          listening={false}
        />
      )}

      {/* Selection stroke overlay */}
      {isSelected && (table.shape === "circle" ? (
        <Circle
          x={table.width / 2}
          y={table.height / 2}
          radius={table.width / 2}
          fill="transparent"
          stroke={accentColor}
          strokeWidth={2}
          listening={false}
        />
      ) : (
        <Rect
          width={table.width}
          height={table.height}
          fill="transparent"
          stroke={accentColor}
          strokeWidth={2}
          cornerRadius={cornerRadius}
          listening={false}
        />
      ))}

      {/* Place settings — SVG image per position */}
      {plateImage && platePositions.map((pos, i) => (
        <Image
          key={`plate-${i}`}
          image={plateImage}
          x={pos.x - 6}
          y={pos.y - 6}
          width={12}
          height={12}
          listening={false}
        />
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
