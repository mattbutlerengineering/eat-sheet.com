/** Maps Google Places API type strings to human-readable cuisine labels. */
export const TYPE_TO_CUISINE: Readonly<Record<string, string>> = {
  italian_restaurant: "Italian",
  pizza_restaurant: "Pizza",
  japanese_restaurant: "Japanese",
  chinese_restaurant: "Chinese",
  mexican_restaurant: "Mexican",
  indian_restaurant: "Indian",
  thai_restaurant: "Thai",
  french_restaurant: "French",
  korean_restaurant: "Korean",
  vietnamese_restaurant: "Vietnamese",
  greek_restaurant: "Greek",
  mediterranean_restaurant: "Mediterranean",
  brazilian_restaurant: "Brazilian",
  middle_eastern_restaurant: "Middle Eastern",
  barbecue_restaurant: "Barbecue",
  seafood_restaurant: "Seafood",
  american_restaurant: "American",
};

/** Returns the first matching cuisine label for the given Google Places types, or null. */
export function mapTypeToCuisine(types: readonly string[]): string | null {
  for (const t of types) {
    const cuisine = TYPE_TO_CUISINE[t];
    if (cuisine) return cuisine;
  }
  return null;
}
