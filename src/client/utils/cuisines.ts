export const CUISINES = [
  "American",
  "Asian Fusion",
  "Bakery/Cafe",
  "Barbecue",
  "Brazilian",
  "Chinese",
  "Deli",
  "Dessert",
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

const CUISINE_EMOJI: Record<string, string> = {
  American: "\u{1F354}",
  "Asian Fusion": "\u{1F961}",
  "Bakery/Cafe": "\u2615",
  Barbecue: "\u{1F525}",
  Brazilian: "\u{1F969}",
  Chinese: "\u{1F962}",
  Deli: "\u{1F96A}",
  Dessert: "\u{1F370}",
  French: "\u{1F950}",
  Greek: "\u{1FAD2}",
  Indian: "\u{1F35B}",
  Italian: "\u{1F35D}",
  Japanese: "\u{1F363}",
  Korean: "\u{1F958}",
  Mediterranean: "\u{1FAD3}",
  Mexican: "\u{1F32E}",
  "Middle Eastern": "\u{1F9C6}",
  Pizza: "\u{1F355}",
  Seafood: "\u{1F99E}",
  Southern: "\u{1F357}",
  Thai: "\u{1F35C}",
  Vietnamese: "\u{1F372}",
  Other: "\u{1F37D}\uFE0F",
};

export function cuisineEmoji(cuisine: string | null | undefined): string {
  if (!cuisine) return "\u{1F37D}\uFE0F";
  return CUISINE_EMOJI[cuisine] ?? "\u{1F37D}\uFE0F";
}

export function cuisineLabel(cuisine: string | null | undefined): string {
  if (!cuisine) return "";
  return `${cuisineEmoji(cuisine)} ${cuisine}`;
}
