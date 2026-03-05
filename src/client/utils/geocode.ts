interface GeoResult {
  readonly lat: number;
  readonly lon: number;
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: { "User-Agent": "EatSheet/1.0" },
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0]!.lat),
      lon: parseFloat(data[0]!.lon),
    };
  } catch {
    return null;
  }
}
