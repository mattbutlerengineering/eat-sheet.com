export type VenueType = "fine_dining" | "casual" | "bar" | "cafe";

export const VENUE_TYPES: readonly VenueType[] = [
  "fine_dining",
  "casual",
  "bar",
  "cafe",
] as const;

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  fine_dining: "Fine Dining",
  casual: "Casual Dining",
  bar: "Bar & Lounge",
  cafe: "Café",
} as const;

export const CUISINE_OPTIONS = [
  "Italian",
  "French",
  "Japanese",
  "Mexican",
  "American",
  "Chinese",
  "Indian",
  "Thai",
  "Mediterranean",
  "Seafood",
  "Steakhouse",
  "Korean",
  "Vietnamese",
  "Spanish",
  "Greek",
  "Brazilian",
  "Ethiopian",
  "Fusion",
] as const;

export type CuisineType = (typeof CUISINE_OPTIONS)[number];

export interface Venue {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: VenueType;
  readonly cuisines: readonly string[];
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly zip: string | null;
  readonly country: string;
  readonly timezone: string;
  readonly phone: string | null;
  readonly website: string | null;
  readonly logoUrl: string | null;
  readonly onboardingCompleted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VenueTheme {
  readonly id: string;
  readonly tenantId: string;
  readonly accent: string;
  readonly accentHover: string;
  readonly surface: string | null;
  readonly surfaceElevated: string | null;
  readonly textPrimary: string | null;
  readonly source: "extracted" | "manual";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VenueWithTheme {
  readonly venue: Venue;
  readonly theme: VenueTheme;
}
