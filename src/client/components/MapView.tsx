import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Restaurant } from "../types";

interface MapViewProps {
  readonly restaurants: readonly Restaurant[];
}

function markerColor(score: number | null): string {
  if (score === null) return "#78716c"; // stone-500
  if (score < 4) return "#ef4444"; // red
  if (score < 7) return "#f59e0b"; // amber
  return "#22c55e"; // green
}

function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  });
}

export function MapView({ restaurants }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  const mappable = restaurants.filter(
    (r): r is Restaurant & { latitude: number; longitude: number } =>
      r.latitude !== null && r.longitude !== null
  );

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    // Center on user location or default
    if (mappable.length > 0) {
      const bounds = L.latLngBounds(mappable.map((r) => [r.latitude, r.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      // Default to US center
      map.setView([39.8283, -98.5795], 4);
    }

    // Try geolocation
    if (mappable.length === 0) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 12);
        },
        () => {} // Fail silently
      );
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when restaurants change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    for (const r of mappable) {
      const color = markerColor(r.avg_score);
      const marker = L.marker([r.latitude, r.longitude], {
        icon: createMarkerIcon(color),
      });

      const scoreText = r.avg_score !== null ? r.avg_score.toFixed(1) : "—";
      const cuisineText = r.cuisine ? `<br/><span style="color:#a8a29e;font-size:12px">${r.cuisine}</span>` : "";

      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:120px">
          <strong>${r.name}</strong>${cuisineText}
          <br/><span style="font-size:14px;font-weight:bold;color:${color}">${scoreText}</span>
          <span style="color:#a8a29e;font-size:12px"> / 10</span>
          <br/><a href="/restaurant/${r.id}" style="color:#f97316;font-size:12px;text-decoration:none">View details →</a>
        </div>`,
        { closeButton: false }
      );

      marker.on("popupopen", () => {
        // Add click handler for the link
        const popup = marker.getPopup();
        if (popup) {
          const el = popup.getElement();
          const link = el?.querySelector("a");
          if (link) {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              navigate(`/restaurant/${r.id}`);
            });
          }
        }
      });

      marker.addTo(map);
    }
  }, [mappable, navigate]);

  if (mappable.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-stone-400 text-sm">
          No restaurants have coordinates yet.
        </p>
        <p className="text-stone-500 text-xs mt-1">
          Add an address when creating a restaurant to see it on the map.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-[60vh] rounded-xl overflow-hidden border border-stone-800/50"
      role="application"
      aria-label="Restaurant map"
    />
  );
}
