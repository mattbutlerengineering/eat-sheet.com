export const CUISINES = [
  "American",
  "Asian Fusion",
  "Barbecue",
  "Brazilian",
  "Chinese",
  "French",
  "Greek",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Pizza",
  "Seafood",
  "Southern",
  "Thai",
  "Vietnamese",
  "Other",
] as const;

export type Cuisine = (typeof CUISINES)[number];
