import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApi, useFetch } from "../hooks/useApi";
import { parseTakeoutFile } from "../utils/takeout-parser";
import type { ParsedPlace } from "../utils/takeout-parser";
import type { Restaurant, ImportResponse } from "../types";
import { Monster } from "./Monster";

type Phase = "upload" | "preview" | "enriching" | "done";

interface ImportRestaurantsProps {
  readonly token: string;
}

interface EnrichedData {
  readonly cuisine?: string;
  readonly address?: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export function ImportRestaurants({ token }: ImportRestaurantsProps) {
  const navigate = useNavigate();
  const { get, post } = useApi(token);
  const { data: existingRestaurants } = useFetch<readonly Restaurant[]>(token, "/api/restaurants");

  const [phase, setPhase] = useState<Phase>("upload");
  const [parsedPlaces, setParsedPlaces] = useState<readonly ParsedPlace[]>([]);
  const [parseSkipped, setParseSkipped] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");

  // Build set of existing google_place_ids for client-side dupe detection
  const existingPlaceIds = useMemo(() => {
    if (!existingRestaurants) return new Set<string>();
    return new Set(
      existingRestaurants
        .filter((r) => r.google_place_id)
        .map((r) => r.google_place_id!)
    );
  }, [existingRestaurants]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = parseTakeoutFile(text);

      if (result.errors.length > 0) {
        setError(result.errors.join(". "));
        return;
      }

      if (result.places.length === 0) {
        setError("No restaurants found in this file");
        return;
      }

      setParsedPlaces(result.places);
      setParseSkipped(result.skipped);

      // Pre-select non-duplicates
      const initialSelected = new Set<number>();
      result.places.forEach((place, i) => {
        if (!place.googlePlaceId || !existingPlaceIds.has(place.googlePlaceId)) {
          initialSelected.add(i);
        }
      });
      setSelected(initialSelected);
      setPhase("preview");
    };
    reader.onerror = () => setError("Failed to read file");
    reader.readAsText(file);
  }, [existingPlaceIds]);

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === parsedPlaces.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parsedPlaces.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const selectedPlaces = parsedPlaces.filter((_, i) => selected.has(i));
    if (selectedPlaces.length === 0) return;

    setPhase("enriching");
    setEnrichProgress({ current: 0, total: selectedPlaces.length });

    // Enrich places that have a googlePlaceId
    const enrichedMap = new Map<number, EnrichedData>();
    const placesToEnrich = selectedPlaces
      .map((place, i) => ({ place, originalIndex: i }))
      .filter(({ place }) => place.googlePlaceId);

    // Batch: 3 concurrent requests at a time
    const BATCH_SIZE = 3;
    for (let i = 0; i < placesToEnrich.length; i += BATCH_SIZE) {
      const batch = placesToEnrich.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async ({ place, originalIndex }) => {
          const data = await get<{
            cuisine: string | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
          }>(`/api/places/${place.googlePlaceId}`);
          return { originalIndex, data };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { originalIndex, data } = result.value;
          enrichedMap.set(originalIndex, {
            ...(data.cuisine ? { cuisine: data.cuisine } : {}),
            ...(data.address ? { address: data.address } : {}),
            ...(data.latitude != null ? { latitude: data.latitude } : {}),
            ...(data.longitude != null ? { longitude: data.longitude } : {}),
          });
        }
        // Silent failure for individual places — import with Takeout data only
      }
      setEnrichProgress({ current: Math.min(i + BATCH_SIZE, placesToEnrich.length), total: placesToEnrich.length });
    }

    // Merge parsed data with enriched data
    const restaurants = selectedPlaces.map((place, i) => {
      const enriched = enrichedMap.get(i) ?? {};
      return {
        name: place.name,
        cuisine: enriched.cuisine ?? undefined,
        address: enriched.address ?? place.address ?? undefined,
        latitude: enriched.latitude ?? place.latitude,
        longitude: enriched.longitude ?? place.longitude,
        google_place_id: place.googlePlaceId ?? undefined,
      };
    });

    try {
      const result = await post<ImportResponse>("/api/restaurants/import", { restaurants });
      setImportResult(result);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setPhase("preview");
    }
  };

  const isDuplicate = (place: ParsedPlace) =>
    !!place.googlePlaceId && existingPlaceIds.has(place.googlePlaceId);

  return (
    <div className="min-h-dvh bg-stone-950">
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => phase === "upload" ? navigate(-1) : setPhase("upload")}
            className="text-stone-400 hover:text-stone-200 transition-colors text-base"
            aria-label="Go back"
          >
            &larr; Back
          </button>
          <h1 className="font-display font-bold text-lg text-stone-50">Import from Google Maps</h1>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Upload Phase */}
        {phase === "upload" && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-stone-900 border border-stone-800/50 rounded-xl p-5 space-y-3">
              <h2 className="font-display font-bold text-stone-50">How to export your saved places</h2>
              <ol className="text-sm text-stone-400 space-y-2 list-decimal list-inside">
                <li>Go to <span className="text-orange-400">takeout.google.com</span></li>
                <li>Click &quot;Deselect all&quot;, then select only <span className="text-stone-200">Maps (Your Places)</span></li>
                <li>Export and download the archive</li>
                <li>Unzip and find <span className="text-stone-200">Saved Places.json</span></li>
              </ol>
            </div>

            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-stone-700 hover:border-orange-500/50 rounded-xl p-8 text-center transition-colors">
                <svg className="mx-auto mb-3 text-stone-500" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-stone-300 font-medium">Upload Saved Places.json</p>
                <p className="text-stone-500 text-sm mt-1">GeoJSON file from Google Takeout</p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {error && (
              <p className="text-red-500 text-sm text-center" role="alert">{error}</p>
            )}
          </div>
        )}

        {/* Preview Phase */}
        {phase === "preview" && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-stone-200 font-medium">
                  Found {parsedPlaces.length} place{parsedPlaces.length !== 1 ? "s" : ""}
                </p>
                {parseSkipped > 0 && (
                  <p className="text-stone-500 text-sm">{parseSkipped} skipped (missing data)</p>
                )}
              </div>
              <button
                onClick={toggleAll}
                className="text-sm text-orange-400 hover:text-orange-300 font-medium"
              >
                {selected.size === parsedPlaces.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {parsedPlaces.map((place, i) => {
                const dup = isDuplicate(place);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSelect(i)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selected.has(i)
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-stone-900 border-stone-800/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selected.has(i)
                          ? "border-orange-500 bg-orange-500"
                          : "border-stone-600"
                      }`}>
                        {selected.has(i) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-stone-50 font-medium truncate">{place.name}</p>
                        {place.address && (
                          <p className="text-stone-500 text-sm truncate">{place.address}</p>
                        )}
                        {dup && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-medium">
                            Already added
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center" role="alert">{error}</p>
            )}

            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Import Selected ({selected.size})
            </button>
          </div>
        )}

        {/* Enriching Phase */}
        {phase === "enriching" && (
          <div className="text-center py-16 animate-fade-up">
            <Monster variant="party" size={48} className="mx-auto" />
            <p className="text-stone-200 font-display font-bold mt-4">Importing restaurants...</p>
            {enrichProgress.total > 0 && (
              <>
                <p className="text-stone-400 text-sm mt-2">
                  Enriching {enrichProgress.current} of {enrichProgress.total}...
                </p>
                <div className="mt-4 mx-auto max-w-xs bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${enrichProgress.total > 0 ? (enrichProgress.current / enrichProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Done Phase */}
        {phase === "done" && importResult && (
          <div className="text-center py-16 animate-fade-up">
            <Monster variant="party" size={56} className="mx-auto" />
            <p className="text-stone-200 font-display font-bold text-xl mt-4">
              Imported {importResult.imported} restaurant{importResult.imported !== 1 ? "s" : ""}!
            </p>
            {importResult.skipped > 0 && (
              <p className="text-stone-400 text-sm mt-2">
                {importResult.skipped} duplicate{importResult.skipped !== 1 ? "s" : ""} skipped
              </p>
            )}

            <div className="mt-6 space-y-3 max-w-sm mx-auto">
              {importResult.results
                .filter((r) => r.status === "created")
                .slice(0, 5)
                .map((r) => (
                  <div key={r.id ?? r.name} className="bg-stone-900 border border-stone-800/50 rounded-xl px-4 py-2 text-left">
                    <p className="text-stone-200 text-sm font-medium truncate">{r.name}</p>
                  </div>
                ))}
              {importResult.results.filter((r) => r.status === "created").length > 5 && (
                <p className="text-stone-500 text-sm">
                  +{importResult.results.filter((r) => r.status === "created").length - 5} more
                </p>
              )}
            </div>

            <button
              onClick={() => navigate("/")}
              className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl active:scale-95 transition-all"
            >
              View All Restaurants
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
