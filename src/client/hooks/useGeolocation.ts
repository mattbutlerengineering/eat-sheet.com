import { useState, useEffect, useCallback } from "react";

interface GeoPosition {
  readonly latitude: number;
  readonly longitude: number;
}

interface UseGeolocationResult {
  readonly position: GeoPosition | null;
  readonly error: string | null;
  readonly loading: boolean;
  readonly refresh: () => void;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

let cachedPosition: GeoPosition | null = null;
let cachedAt = 0;

export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(cachedPosition);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPosition = useCallback(() => {
    // Return cached if fresh
    if (cachedPosition && Date.now() - cachedAt < CACHE_DURATION_MS) {
      setPosition(cachedPosition);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition: GeoPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        cachedPosition = newPosition;
        cachedAt = Date.now();
        setPosition(newPosition);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: CACHE_DURATION_MS }
    );
  }, []);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return { position, error, loading, refresh: fetchPosition };
}
