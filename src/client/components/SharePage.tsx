import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Monster } from "./Monster";

interface SharedRestaurant {
  readonly name: string;
  readonly cuisine: string | null;
  readonly address: string | null;
  readonly photo_url: string | null;
  readonly avg_score: number | null;
  readonly review_count: number;
}

interface SharedReview {
  readonly overall_score: number;
  readonly notes: string | null;
  readonly photo_url: string | null;
  readonly restaurant_name: string;
  readonly restaurant_cuisine: string | null;
}

export function SharePage() {
  const { type, token } = useParams<{ type: string; token: string }>();
  const [data, setData] = useState<SharedRestaurant | SharedReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!type || !token) return;
    fetch(`/api/share/${type}/${token}`)
      .then((r) => r.json())
      .then((json: any) => {
        if (json.data) setData(json.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [type, token]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex items-center justify-center">
        <Monster variant="party" size={48} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-3 px-4">
        <Monster variant="snarky" size={56} />
        <p className="text-stone-400 text-center">This share link is no longer available.</p>
      </div>
    );
  }

  const isRestaurant = type === "restaurant";
  const r = data as SharedRestaurant;
  const rv = data as SharedReview;

  return (
    <div className="min-h-dvh bg-stone-950 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-black text-orange-500 italic">eat sheet</h1>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          {isRestaurant ? (
            <>
              {r.photo_url && (
                <img src={r.photo_url} alt={r.name} className="w-full h-48 object-cover rounded-lg mb-4" />
              )}
              <h2 className="font-display font-bold text-2xl text-stone-50">{r.name}</h2>
              {r.cuisine && <p className="text-orange-500 text-sm mt-1">{r.cuisine}</p>}
              {r.address && <p className="text-stone-500 text-sm mt-1">{r.address}</p>}
              {r.avg_score !== null && (
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display font-black text-4xl text-green-500">{r.avg_score.toFixed(1)}</span>
                  <span className="text-stone-500">/ 10 from {r.review_count} reviews</span>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="font-display font-bold text-xl text-stone-50">{rv.restaurant_name}</h2>
              {rv.restaurant_cuisine && <p className="text-orange-500 text-sm mt-1">{rv.restaurant_cuisine}</p>}
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display font-black text-3xl text-green-500">{rv.overall_score}</span>
                <span className="text-stone-500">/ 10</span>
              </div>
              {rv.notes && (
                <div className="mt-3 bg-stone-800/40 rounded-lg p-3 border-l-2 border-orange-500/30">
                  <p className="text-stone-300 italic">{rv.notes}</p>
                </div>
              )}
              {rv.photo_url && (
                <img src={rv.photo_url} alt="Review photo" className="w-full h-40 object-cover rounded-lg mt-3" />
              )}
            </>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-stone-500 text-sm mb-3">Rate restaurants with your family</p>
          <a href="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            Join Eat Sheet
          </a>
        </div>
      </div>
    </div>
  );
}
