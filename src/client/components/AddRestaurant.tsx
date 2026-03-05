import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi, useFetch } from "../hooks/useApi";
import { PhotoUpload } from "./PhotoUpload";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import type { PlaceSelection } from "./PlaceAutocomplete";
import { geocodeAddress } from "../utils/geocode";
import { CUISINES } from "../utils/cuisines";
import type { Restaurant } from "../types";

const SELECT_ARROW_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2378716c' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")";

interface AddRestaurantProps {
  readonly token: string;
}

export function AddRestaurant({ token }: AddRestaurantProps) {
  const navigate = useNavigate();
  const { post } = useApi(token);
  const { data: restaurants } = useFetch<readonly Restaurant[]>(token, "/api/restaurants");

  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Google Places state
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [duplicateRestaurant, setDuplicateRestaurant] = useState<Restaurant | null>(null);

  const handlePlaceSelect = (place: PlaceSelection) => {
    setName(place.name);
    setAddress(place.address ?? "");
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setGooglePlaceId(place.google_place_id);

    // Auto-fill cuisine if Google provided one and user hasn't chosen yet
    if (place.cuisine && !cuisine) {
      setCuisine(place.cuisine);
    }

    // Client-side duplicate detection
    const existing = restaurants?.find((r) => r.google_place_id === place.google_place_id);
    setDuplicateRestaurant(existing ?? null);
    setError("");
  };

  const handleManualInput = (value: string) => {
    setName(value);
    setGooglePlaceId(null);
    setLatitude(null);
    setLongitude(null);
    setDuplicateRestaurant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError("");
    setSubmitting(true);
    try {
      let lat = latitude;
      let lng = longitude;

      // Geocode manually-typed addresses (no Google place selected)
      if (!googlePlaceId && address.trim()) {
        const geo = await geocodeAddress(address.trim());
        if (geo) {
          lat = geo.lat;
          lng = geo.lon;
        }
      }

      const restaurant = await post<Restaurant>("/api/restaurants", {
        name: name.trim(),
        cuisine: cuisine.trim() || undefined,
        address: address.trim() || undefined,
        photo_url: photoUrl ?? undefined,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        google_place_id: googlePlaceId ?? undefined,
      });
      navigate(`/restaurant/${restaurant.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add restaurant";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-stone-950">
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-stone-400 hover:text-stone-200 transition-colors text-base"
            aria-label="Go back"
          >
            &larr; Back
          </button>
          <h1 className="font-display font-bold text-lg text-stone-50">Add Restaurant</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        <div>
          <label className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
            Name *
          </label>
          <PlaceAutocomplete
            token={token}
            onSelect={handlePlaceSelect}
            onManualInput={handleManualInput}
          />
        </div>

        {duplicateRestaurant && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3" role="alert">
            <p className="text-amber-400 text-sm font-medium">Already in your list!</p>
            <button
              type="button"
              onClick={() => navigate(`/restaurant/${duplicateRestaurant.id}`)}
              className="text-orange-400 text-sm underline mt-1"
            >
              View {duplicateRestaurant.name} &rarr;
            </button>
          </div>
        )}

        <div>
          <label htmlFor="r-cuisine" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
            Cuisine
          </label>
          <select
            id="r-cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors appearance-none"
            style={{ backgroundImage: SELECT_ARROW_SVG, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center" }}
          >
            <option value="">Select cuisine...</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="r-address" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
            Address
          </label>
          <input
            id="r-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Where is it? (enables map pin)"
            className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
          />
        </div>

        <PhotoUpload token={token} onUploaded={setPhotoUrl} />

        {error && (
          <p className="text-red-500 text-sm text-center" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !!duplicateRestaurant}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
        >
          {submitting ? "Adding..." : "Add Restaurant"}
        </button>
      </form>
    </div>
  );
}
