import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFetch, useApi } from "../hooks/useApi";
import { ReviewForm } from "./ReviewForm";
import type { RestaurantDetail as RestaurantDetailType, Member, Review } from "../types";
import type { ReviewData } from "./ReviewForm";

interface RestaurantDetailProps {
  readonly token: string;
  readonly member: Member;
}

function scoreColor(score: number): string {
  if (score <= 3) return "text-red-500";
  if (score <= 5) return "text-amber-500";
  if (score <= 7) return "text-amber-400";
  return "text-green-500";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function RestaurantDetail({ token, member }: RestaurantDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { post, put, del } = useApi(token);
  const { data: restaurant, loading, refresh } = useFetch<RestaurantDetailType>(
    token,
    id ? `/api/restaurants/${id}` : null
  );
  const [showForm, setShowForm] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const myReview = restaurant?.reviews.find((r) => r.member_id === member.id);
  const isCreator = restaurant?.created_by === member.id;

  const handleDeleteRestaurant = async () => {
    await del(`/api/restaurants/${id}`);
    navigate("/");
  };

  const handleDeleteReview = async (reviewId: string) => {
    await del(`/api/reviews/${reviewId}`);
    setConfirmDelete(null);
    refresh();
  };

  const handleSubmitReview = async (data: ReviewData) => {
    if (myReview) {
      await put(`/api/reviews/${myReview.id}`, data);
    } else {
      await post(`/api/reviews/${id}`, data);
    }
    setShowForm(false);
    refresh();
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950">
        <div className="px-4 py-6 space-y-4">
          <div className="shimmer h-8 w-48 rounded-lg" />
          <div className="shimmer h-4 w-32 rounded" />
          <div className="shimmer h-32 rounded-xl mt-6" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-dvh bg-stone-950 flex items-center justify-center">
        <p className="text-stone-400">Restaurant not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-950 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-stone-400 hover:text-stone-200 transition-colors text-sm"
          >
            ← Back
          </button>
        </div>
      </header>

      <div className="px-4 max-w-lg mx-auto">
        {/* Restaurant Info */}
        <div className="py-6">
          <h2 className="font-display font-black text-3xl text-stone-50">{restaurant.name}</h2>
          <div className="flex items-center gap-3 mt-2">
            {restaurant.cuisine && (
              <span className="text-sm text-orange-500 font-medium">{restaurant.cuisine}</span>
            )}
            {restaurant.address && (
              <span className="text-sm text-stone-500">{restaurant.address}</span>
            )}
          </div>

          {/* Average Score */}
          {restaurant.avg_score !== null && (
            <div className="mt-4 flex items-baseline gap-2">
              <span className={`font-display font-black text-5xl ${scoreColor(restaurant.avg_score)}`}>
                {restaurant.avg_score.toFixed(1)}
              </span>
              <span className="text-stone-500 text-sm">
                / 10 from {restaurant.review_count} {restaurant.review_count === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </div>

        {/* Delete Restaurant (creator only) */}
        {isCreator && (
          <div className="mb-4">
            {confirmDelete === "restaurant" ? (
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteRestaurant}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-stone-800 text-stone-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete("restaurant")}
                className="text-xs text-stone-500 hover:text-red-400 transition-colors"
              >
                Delete Restaurant
              </button>
            )}
          </div>
        )}

        {/* Add/Edit Review Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3.5 mb-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            {myReview ? "Edit Your Review" : "Add Your Review"}
          </button>
        )}

        {/* Review Form */}
        {showForm && (
          <div className="mb-6 bg-stone-900 border border-stone-800 rounded-xl p-4">
            <ReviewForm
              existingReview={myReview}
              onSubmit={handleSubmitReview}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Reviews List */}
        <div>
          <h3 className="font-display font-bold text-lg text-stone-300 mb-4">
            Reviews ({restaurant.reviews.length})
          </h3>

          {restaurant.reviews.length === 0 && (
            <p className="text-stone-500 text-sm py-4 text-center">
              No reviews yet. Be the first!
            </p>
          )}

          <div className="space-y-3">
            {restaurant.reviews.map((review: Review, i: number) => (
              <div
                key={review.id}
                className="bg-stone-900 border border-stone-800/50 rounded-xl p-4 animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-medium text-stone-200">{review.member_name}</span>
                    {review.visited_at && (
                      <span className="text-stone-500 text-xs ml-2">
                        {formatDate(review.visited_at)}
                      </span>
                    )}
                  </div>
                  <span className={`font-display font-black text-xl ${scoreColor(review.overall_score)}`}>
                    {review.overall_score}
                  </span>
                </div>

                {/* Category Scores */}
                {(review.food_score || review.service_score || review.ambiance_score || review.value_score) && (
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {review.food_score && (
                      <span className="text-xs text-stone-400">
                        Food: <span className={scoreColor(review.food_score)}>{review.food_score}</span>
                      </span>
                    )}
                    {review.service_score && (
                      <span className="text-xs text-stone-400">
                        Service: <span className={scoreColor(review.service_score)}>{review.service_score}</span>
                      </span>
                    )}
                    {review.ambiance_score && (
                      <span className="text-xs text-stone-400">
                        Ambiance: <span className={scoreColor(review.ambiance_score)}>{review.ambiance_score}</span>
                      </span>
                    )}
                    {review.value_score && (
                      <span className="text-xs text-stone-400">
                        Value: <span className={scoreColor(review.value_score)}>{review.value_score}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Notes */}
                {review.notes && (
                  <p className="mt-3 text-sm text-stone-300 leading-relaxed">{review.notes}</p>
                )}

                {/* Delete own review */}
                {review.member_id === member.id && (
                  <div className="mt-3 pt-2 border-t border-stone-800/50">
                    {confirmDelete === review.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-xs text-red-400 font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-stone-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(review.id)}
                        className="text-xs text-stone-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
