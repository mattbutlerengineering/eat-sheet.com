import { z } from "zod";
import { VENUE_TYPES } from "../types/venue";

export const venueInfoSchema = z.object({
  name: z.string().min(1, "Venue name is required").max(100),
  type: z.enum(VENUE_TYPES as unknown as [string, ...string[]]),
  cuisines: z.array(z.string()).min(1, "Select at least one cuisine"),
});
export type VenueInfoInput = z.infer<typeof venueInfoSchema>;

export const venueLocationSchema = z.object({
  addressLine1: z.string().max(200).optional().default(""),
  addressLine2: z.string().max(200).optional().default(""),
  city: z.string().max(100).optional().default(""),
  state: z.string().max(100).optional().default(""),
  zip: z.string().max(20).optional().default(""),
  country: z.string().max(2).default("US"),
  timezone: z.string().min(1, "Timezone is required"),
  phone: z.string().max(20).optional().default(""),
  website: z.string().max(200).optional().default(""),
});
export type VenueLocationInput = z.infer<typeof venueLocationSchema>;

export const venueBrandSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  accentHover: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  surface: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  surfaceElevated: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  textPrimary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  source: z.enum(["extracted", "manual"]),
});
export type VenueBrandInput = z.infer<typeof venueBrandSchema>;

export const floorPlanSelectionSchema = z.object({
  templateId: z.string().min(1),
  size: z.string().min(1),
  tableCount: z.number().int().min(1).optional(),
  seatCount: z.number().int().min(1).optional(),
});

export const onboardingCompleteSchema = z.object({
  venueInfo: venueInfoSchema,
  location: venueLocationSchema,
  brand: venueBrandSchema,
  logoUrl: z.string().nullable().default(null),
  floorPlan: floorPlanSelectionSchema.optional(),
});
export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
