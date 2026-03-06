const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ParsedPlace {
  readonly name: string;
  readonly googlePlaceId: string | null;
  readonly address: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly googleMapsUrl: string | null;
}

export interface ParseResult {
  readonly places: readonly ParsedPlace[];
  readonly skipped: number;
  readonly errors: readonly string[];
}

export function extractPlaceId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/place_id:([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function parseTakeoutFile(json: string): ParseResult {
  if (json.length > MAX_FILE_SIZE) {
    return { places: [], skipped: 0, errors: ["File exceeds 10MB limit"] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { places: [], skipped: 0, errors: ["Invalid JSON — could not parse file"] };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.type !== "FeatureCollection" || !Array.isArray(obj.features)) {
    return { places: [], skipped: 0, errors: ["Expected a GeoJSON FeatureCollection"] };
  }

  const places: ParsedPlace[] = [];
  let skipped = 0;

  for (const feature of obj.features as unknown[]) {
    const f = feature as Record<string, unknown>;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const title = props.Title as string | undefined;

    if (!title?.trim()) {
      skipped++;
      continue;
    }

    const coords = resolveCoordinates(f, props);
    if (!coords) {
      skipped++;
      continue;
    }

    const googleMapsUrl = (props["Google Maps URL"] as string) || null;

    places.push({
      name: title.trim(),
      googlePlaceId: extractPlaceId(googleMapsUrl ?? ""),
      address: resolveAddress(props),
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapsUrl,
    });
  }

  return { places, skipped, errors: [] };
}

function resolveCoordinates(
  feature: Record<string, unknown>,
  props: Record<string, unknown>
): { lat: number; lng: number } | null {
  // Prefer Location.Geo Coordinates
  const location = props.Location as Record<string, unknown> | undefined;
  const geo = location?.["Geo Coordinates"] as Record<string, string> | undefined;

  if (geo?.Latitude && geo?.Longitude) {
    const lat = parseFloat(geo.Latitude);
    const lng = parseFloat(geo.Longitude);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Fall back to geometry.coordinates [lng, lat] (GeoJSON order)
  const geometry = feature.geometry as Record<string, unknown> | null;
  const coordinates = geometry?.coordinates as number[] | undefined;
  if (coordinates && coordinates.length >= 2) {
    const lat = coordinates[1]!;
    const lng = coordinates[0]!;
    return { lat, lng };
  }

  return null;
}

function resolveAddress(props: Record<string, unknown>): string | null {
  const location = props.Location as Record<string, unknown> | undefined;
  const address = location?.Address as string | undefined;
  return address?.trim() || null;
}
