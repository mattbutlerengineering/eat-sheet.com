import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PhotoUpload } from "./PhotoUpload";
import { geocodeAddress } from "../utils/geocode";
import type { Restaurant } from "../types";

interface AddRestaurantProps {
  readonly token: string;
}

export function AddRestaurant({ token }: AddRestaurantProps) {
  const navigate = useNavigate();
  const { post } = useApi(token);
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError("");
    setSubmitting(true);
    try {
      // Try to geocode the address
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (address.trim()) {
        const geo = await geocodeAddress(address.trim());
        if (geo) {
          latitude = geo.lat;
          longitude = geo.lon;
        }
      }

      const restaurant = await post<Restaurant>("/api/restaurants", {
        name: name.trim(),
        cuisine: cuisine.trim() || undefined,
        address: address.trim() || undefined,
        photo_url: photoUrl ?? undefined,
        latitude,
        longitude,
      });
      navigate(`/restaurant/${restaurant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add restaurant");
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
            ← Back
          </button>
          <h1 className="font-display font-bold text-lg text-stone-50">Add Restaurant</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        <div>
          <label htmlFor="r-name" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
            Name *
          </label>
          <input
            id="r-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Restaurant name"
            autoFocus
            className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="r-cuisine" className="block text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
            Cuisine
          </label>
          <input
            id="r-cuisine"
            type="text"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Italian, Japanese, Mexican..."
            className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
          />
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
          disabled={submitting || !name.trim()}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
        >
          {submitting ? "Adding..." : "Add Restaurant"}
        </button>
      </form>
    </div>
  );
}
