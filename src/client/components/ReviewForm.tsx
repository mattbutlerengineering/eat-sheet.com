import { useState } from "react";
import { ScoreSlider } from "./ScoreSlider";
import { PhotoUpload } from "./PhotoUpload";
import type { Review } from "../types";

interface ReviewFormProps {
  readonly token: string;
  readonly existingReview?: Review;
  readonly onSubmit: (data: ReviewData) => Promise<void>;
  readonly onCancel: () => void;
}

export interface ReviewData {
  readonly overall_score: number;
  readonly food_score: number | null;
  readonly service_score: number | null;
  readonly ambiance_score: number | null;
  readonly value_score: number | null;
  readonly notes: string;
  readonly photo_url: string | null;
  readonly visited_at: string;
}

export function ReviewForm({ token, existingReview, onSubmit, onCancel }: ReviewFormProps) {
  const [overall, setOverall] = useState<number | null>(existingReview?.overall_score ?? 5);
  const [food, setFood] = useState<number | null>(existingReview?.food_score ?? null);
  const [service, setService] = useState<number | null>(existingReview?.service_score ?? null);
  const [ambiance, setAmbiance] = useState<number | null>(existingReview?.ambiance_score ?? null);
  const [value, setValue] = useState<number | null>(existingReview?.value_score ?? null);
  const [notes, setNotes] = useState(existingReview?.notes ?? "");
  const [visitedAt, setVisitedAt] = useState(
    existingReview?.visited_at ?? new Date().toISOString().split("T")[0]!
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(existingReview?.photo_url ?? null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overall) return;

    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        overall_score: overall,
        food_score: food,
        service_score: service,
        ambiance_score: ambiance,
        value_score: value,
        notes: notes.trim(),
        photo_url: photoUrl,
        visited_at: visitedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display font-bold text-lg text-stone-50">
        {existingReview ? "Edit Your Review" : "Add Your Review"}
      </h3>

      <ScoreSlider label="Overall" value={overall} onChange={setOverall} required />

      <div className="border-t border-stone-800 pt-3">
        <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Breakdown (optional)</p>
        <ScoreSlider label="Food" value={food} onChange={setFood} />
        <ScoreSlider label="Service" value={service} onChange={setService} />
        <ScoreSlider label="Ambiance" value={ambiance} onChange={setAmbiance} />
        <ScoreSlider label="Value" value={value} onChange={setValue} />
      </div>

      <div>
        <label htmlFor="visit-date" className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
          Visited
        </label>
        <input
          id="visit-date"
          type="date"
          value={visitedAt}
          onChange={(e) => setVisitedAt(e.target.value)}
          className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
          Bits & Bobs
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What stood out? Any dishes to remember?"
          rows={3}
          className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors resize-none"
        />
      </div>

      <PhotoUpload token={token} onUploaded={setPhotoUrl} existingUrl={existingReview?.photo_url} />

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !overall}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
        >
          {submitting ? "Saving..." : "Save Review"}
        </button>
      </div>
    </form>
  );
}
