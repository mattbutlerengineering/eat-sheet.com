import { useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Transformer, Line } from "react-konva";
import type Konva from "konva";
import { nanoid } from "nanoid";
import { CanvasGrid } from "./CanvasGrid";
import { TableShape } from "./TableShape";
import { SectionZone } from "./SectionZone";
import { WallShape } from "./WallShape";
import { useFloorPlanEditorContext, snapToGrid } from "../hooks/useFloorPlanEditor";
import type { EditorTable } from "../types";

interface FloorPlanCanvasProps {
  readonly width: number;
  readonly height: number;
  readonly accentColor: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

const DEFAULT_TABLE_SIZE = 60;

function getShapeForTool(
  tool: string,
): { shape: EditorTable["shape"]; width: number; height: number } | null {
  switch (tool) {
    case "add-circle":
      return { shape: "circle", width: DEFAULT_TABLE_SIZE, height: DEFAULT_TABLE_SIZE };
    case "add-square":
      return { shape: "square", width: DEFAULT_TABLE_SIZE, height: DEFAULT_TABLE_SIZE };
    case "add-rectangle":
      return { shape: "rectangle", width: 100, height: DEFAULT_TABLE_SIZE };
    default:
      return null;
  }
}

export function FloorPlanCanvas({
  width,
  height,
  accentColor,
}: FloorPlanCanvasProps) {
  const { state, dispatch } = useFloorPlanEditorContext();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const { tables, sections, walls, selectedId, selectedType, tool, wallDraftStart, snapToGrid: snap, zoom, stagePosition, canvasWidth, canvasHeight } = state;

  // Attach transformer to selected table node
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    if (selectedId && (selectedType === "table" || selectedType === "section")) {
      const stage = stageRef.current;
      const node = stage?.findOne(`#${selectedId}`);
      if (node) {
        transformer.nodes([node]);
        transformer.getLayer()?.batchDraw();
        return;
      }
    }

    transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, selectedType]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, oldScale + direction * ZOOM_STEP),
      );

      const mousePointTo = {
        x: (pointer.x - stagePosition.x) / oldScale,
        y: (pointer.y - stagePosition.y) / oldScale,
      };

      dispatch({ type: "SET_ZOOM", zoom: newScale });
      dispatch({
        type: "SET_STAGE_POSITION",
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [zoom, stagePosition, dispatch],
  );

  const getCanvasPoint = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return null;
    const rawX = (pointer.x - stagePosition.x) / zoom;
    const rawY = (pointer.y - stagePosition.y) / zoom;
    const x = Math.max(0, Math.min(canvasWidth, rawX));
    const y = Math.max(0, Math.min(canvasHeight, rawY));
    return snap ? { x: snapToGrid(x), y: snapToGrid(y) } : { x, y };
  }, [stagePosition, zoom, snap, canvasWidth, canvasHeight]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // If clicked on empty area
      if (e.target === e.target.getStage()) {
        // Wall drawing: two-click placement
        if (tool === "add-wall" || tool === "add-window") {
          const point = getCanvasPoint();
          if (!point) return;

          if (!wallDraftStart) {
            dispatch({ type: "SET_WALL_DRAFT_START", x: point.x, y: point.y });
          } else {
            dispatch({
              type: "ADD_WALL",
              wall: {
                id: nanoid(),
                x1: wallDraftStart.x,
                y1: wallDraftStart.y,
                x2: point.x,
                y2: point.y,
                thickness: tool === "add-window" ? 4 : 6,
                wallType: tool === "add-window" ? "window" : "wall",
              },
            });
          }
          return;
        }

        const shapeInfo = getShapeForTool(tool);

        if (shapeInfo) {
          const point = getCanvasPoint();
          if (!point) return;

          const x = point.x - shapeInfo.width / 2;
          const y = point.y - shapeInfo.height / 2;

          const tableCount = tables.length + 1;
          const newTable: EditorTable = {
            id: nanoid(),
            floorPlanId: state.floorPlan?.id ?? "",
            sectionId: null,
            label: `T${tableCount}`,
            shape: shapeInfo.shape,
            minCapacity: shapeInfo.shape === "rectangle" ? 4 : 2,
            maxCapacity: shapeInfo.shape === "rectangle" ? 8 : 4,
            x,
            y,
            width: shapeInfo.width,
            height: shapeInfo.height,
            rotation: 0,
          };

          dispatch({ type: "ADD_TABLE", table: newTable });
        } else {
          dispatch({ type: "DESELECT" });
        }
        return;
      }
    },
    [tool, zoom, stagePosition, wallDraftStart, tables.length, state.floorPlan?.id, dispatch, getCanvasPoint],
  );

  const handleSelectTable = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT", id, elementType: "table" });
    },
    [dispatch],
  );

  const handleSelectSection = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT", id, elementType: "section" });
    },
    [dispatch],
  );

  const handleTableDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      const table = tables.find((t) => t.id === id);
      const w = table?.width ?? 60;
      const h = table?.height ?? 60;
      const cx = Math.max(0, Math.min(canvasWidth - w, x));
      const cy = Math.max(0, Math.min(canvasHeight - h, y));
      const sx = snap ? snapToGrid(cx) : cx;
      const sy = snap ? snapToGrid(cy) : cy;
      dispatch({ type: "MOVE_TABLE", id, x: sx, y: sy });
    },
    [dispatch, snap, tables, canvasWidth, canvasHeight],
  );

  const handleTableTransformEnd = useCallback(
    (
      id: string,
      newWidth: number,
      newHeight: number,
      rotation: number,
      x: number,
      y: number,
    ) => {
      dispatch({
        type: "TRANSFORM_TABLE",
        id,
        width: snap ? snapToGrid(newWidth) : newWidth,
        height: snap ? snapToGrid(newHeight) : newHeight,
        rotation,
        x: snap ? snapToGrid(x) : x,
        y: snap ? snapToGrid(y) : y,
      });
    },
    [dispatch, snap],
  );

  const handleSelectWall = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT", id, elementType: "wall" });
    },
    [dispatch],
  );

  const handleSectionTransformEnd = useCallback(
    (id: string, width: number, height: number, x: number, y: number) => {
      const cw = snap ? snapToGrid(width) : width;
      const ch = snap ? snapToGrid(height) : height;
      const cx = snap ? snapToGrid(x) : x;
      const cy = snap ? snapToGrid(y) : y;
      dispatch({
        type: "UPDATE_SECTION",
        id,
        changes: {
          width: Math.max(40, cw),
          height: Math.max(40, ch),
          x: Math.max(0, Math.min(canvasWidth - cw, cx)),
          y: Math.max(0, Math.min(canvasHeight - ch, cy)),
        },
      });
    },
    [dispatch, snap, canvasWidth, canvasHeight],
  );

  const handleSectionDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      const section = sections.find((s) => s.id === id);
      const w = section?.width ?? 200;
      const h = section?.height ?? 150;
      const cx = Math.max(0, Math.min(canvasWidth - w, x));
      const cy = Math.max(0, Math.min(canvasHeight - h, y));
      const sx = snap ? snapToGrid(cx) : cx;
      const sy = snap ? snapToGrid(cy) : cy;
      dispatch({ type: "UPDATE_SECTION", id, changes: { x: sx, y: sy } });
    },
    [dispatch, snap, sections, canvasWidth, canvasHeight],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (e.target === stageRef.current) {
        dispatch({
          type: "SET_STAGE_POSITION",
          x: e.target.x(),
          y: e.target.y(),
        });
      }
    },
    [dispatch],
  );

  const isAddTool = tool.startsWith("add-");
  const cursor = isAddTool ? "crosshair" : "default";

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={stagePosition.x}
      y={stagePosition.y}
      draggable={!isAddTool}
      onWheel={handleWheel}
      onClick={handleStageClick}
      onTap={handleStageClick}
      onDragEnd={handleDragEnd}
      style={{ cursor, background: "var(--rialto-surface-recessed, #161412)" }}
    >
      <Layer listening={false}>
        <CanvasGrid width={canvasWidth} height={canvasHeight} />
      </Layer>

      <Layer>
        {/* Walls — rendered behind sections and tables */}
        {walls.map((w) => (
          <WallShape
            key={w.id}
            wall={w}
            isSelected={selectedId === w.id}
            accentColor={accentColor}
            onSelect={handleSelectWall}
          />
        ))}
        {/* Draft wall line while drawing */}
        {wallDraftStart && (tool === "add-wall" || tool === "add-window") && (
          <Line
            points={[wallDraftStart.x, wallDraftStart.y, wallDraftStart.x + 1, wallDraftStart.y]}
            stroke={accentColor}
            strokeWidth={6}
            dash={[6, 4]}
            lineCap="square"
            opacity={0.5}
            listening={false}
          />
        )}
        {sections.map((s) => (
          <SectionZone
            key={s.id}
            section={s}
            isSelected={selectedId === s.id}
            onSelect={handleSelectSection}
            onDragEnd={handleSectionDragEnd}
            onTransformEnd={handleSectionTransformEnd}
          />
        ))}
        {tables.map((t) => (
          <TableShape
            key={t.id}
            table={t}
            isSelected={selectedId === t.id}
            accentColor={accentColor}
            onSelect={handleSelectTable}
            onDragEnd={handleTableDragEnd}
            onTransformEnd={handleTableTransformEnd}
          />
        ))}
        <Transformer
          ref={transformerRef}
          rotateEnabled={selectedType === "table"}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          boundBoxFunc={(_oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
              return _oldBox;
            }
            return newBox;
          }}
          borderStroke={accentColor}
          anchorFill={accentColor}
          anchorStroke="#fff"
          anchorSize={8}
          anchorCornerRadius={2}
        />
      </Layer>
    </Stage>
  );
}
