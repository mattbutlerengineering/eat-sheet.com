import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "../hooks/useGeolocation";
import { cuisineEmoji } from "../utils/cuisines";
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

const USER_LOCATION_ICON = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.25),0 2px 6px rgba(0,0,0,0.3);"></div>`,
});

function directionsUrl(r: Restaurant & { latitude: number; longitude: number }): string {
  if (r.google_place_id) {
    return `https://www.google.com/maps/dir/?api=1&destination_place_id=${r.google_place_id}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`;
}

export function MapView({ restaurants }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const navigate = useNavigate();
  const { position } = useGeolocation();

  const mappable = useMemo(
    () => restaurants.filter(
      (r): r is Restaurant & { latitude: number; longitude: number } =>
        r.latitude !== null && r.longitude !== null
    ),
    [restaurants]
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

    if (mappable.length > 0) {
      const bounds = L.latLngBounds(mappable.map((r) => [r.latitude, r.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (position) {
      map.setView([position.latitude, position.longitude], 12);
    } else {
      map.setView([39.8283, -98.5795], 4);
    }

    return () => {
      map.remove();
      mapInstance.current = null;
      userMarkerRef.current = null;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show user location blue dot
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !position) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([position.latitude, position.longitude]);
    } else {
      userMarkerRef.current = L.marker([position.latitude, position.longitude], {
        icon: USER_LOCATION_ICON,
        zIndexOffset: -1000,
      })
        .bindPopup(
          `<div style="font-family:sans-serif;text-align:center">
            <span style="color:#3b82f6;font-weight:bold;font-size:12px">You are here</span>
          </div>`,
          { closeButton: false }
        )
        .addTo(map);
    }
  }, [position]);

  // Update restaurant markers when restaurants change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing restaurant markers (not user location)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== userMarkerRef.current) {
        map.removeLayer(layer);
      }
    });

    for (const r of mappable) {
      const color = markerColor(r.avg_score);
      const marker = L.marker([r.latitude, r.longitude], {
        icon: createMarkerIcon(color),
      });

      const scoreText = r.avg_score !== null ? r.avg_score.toFixed(1) : "\u2014";
      const cuisineText = r.cuisine ? `<br/><span style="color:#a8a29e;font-size:12px">${cuisineEmoji(r.cuisine)} ${r.cuisine}</span>` : "";
      const dirUrl = directionsUrl(r);

      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:120px">
          <strong>${r.name}</strong>${cuisineText}
          <br/><span style="font-size:14px;font-weight:bold;color:${color}">${scoreText}</span>
          <span style="color:#a8a29e;font-size:12px"> / 10</span>
          <br/><a href="/restaurant/${r.id}" data-nav style="color:#f97316;font-size:12px;text-decoration:none">View details \u2192</a>
          <br/><a href="${dirUrl}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;font-size:12px;text-decoration:none">Get directions \u2192</a>
        </div>`,
        { closeButton: false }
      );

      marker.on("popupopen", () => {
        const popup = marker.getPopup();
        if (popup) {
          const el = popup.getElement();
          const navLink = el?.querySelector("a[data-nav]");
          if (navLink) {
            navLink.addEventListener("click", (e) => {
              e.preventDefault();
              navigate(`/restaurant/${r.id}`);
            }, { once: true });
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
