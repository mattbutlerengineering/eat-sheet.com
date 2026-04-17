import { z } from "zod";

export const createFloorPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
});

export type CreateFloorPlanInput = z.infer<typeof createFloorPlanSchema>;

export const renameFloorPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
});

export type RenameFloorPlanInput = z.infer<typeof renameFloorPlanSchema>;

const tableShapeSchema = z.enum(["circle", "square", "rectangle"]);

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");

const saveTableSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(20),
  shape: tableShapeSchema,
  minCapacity: z.number().int().min(1).max(100),
  maxCapacity: z.number().int().min(1).max(100),
  sectionId: z.string().nullable(),
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000),
  width: z.number().min(20).max(500),
  height: z.number().min(20).max(500),
  rotation: z.number().min(0).max(360),
});

const saveSectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  color: hexColorSchema,
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000),
  width: z.number().min(40).max(5000),
  height: z.number().min(40).max(5000),
});

const saveWallSchema = z.object({
  id: z.string().min(1),
  x1: z.number().min(-10000).max(10000),
  y1: z.number().min(-10000).max(10000),
  x2: z.number().min(-10000).max(10000),
  y2: z.number().min(-10000).max(10000),
  thickness: z.number().min(2).max(20),
  wallType: z.enum(["wall", "window"]).optional(),
});

export const saveFloorPlanSchema = z
  .object({
    canvasWidth: z.number().int().min(400).max(5000),
    canvasHeight: z.number().int().min(300).max(5000),
    tables: z.array(saveTableSchema).max(200),
    sections: z.array(saveSectionSchema).max(50),
    walls: z.array(saveWallSchema).max(100),
  })
  .refine(
    (data) => data.tables.every((t) => t.minCapacity <= t.maxCapacity),
    { message: "minCapacity must be <= maxCapacity for all tables" },
  );

export type SaveFloorPlanInput = z.infer<typeof saveFloorPlanSchema>;
