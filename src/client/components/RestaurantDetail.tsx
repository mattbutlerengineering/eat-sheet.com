import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFetch, useApi } from "../hooks/useApi";
import { useCountUp } from "../hooks/useCountUp";
import { ReviewForm } from "./ReviewForm";
import { MemberAvatar } from "./MemberAvatar";
import { Slurms } from "./Slurms";
import { scorePersonality, SLURMS_QUOTES, randomLoadingMessage } from "../utils/personality";
import { ReactionBar } from "./ReactionBar";
import { PhotoGallery } from "./PhotoGallery";
import { BookmarkButton } from "./BookmarkButton";
import { ShareButton } from "./ShareButton";
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
  const { data: bookmarkList, refresh: refreshBookmarks } = useFetch<readonly { id: string }[]>(
    token,
    "/api/bookmarks"
  );
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const isBookmarked = bookmarkList?.some((b) => b.id === id) ?? false;

  const animatedScore = useCountUp(restaurant?.avg_score ?? null);

  const myReview = restaurant?.reviews.find((r) => r.member_id === member.id);
  const isCreator = restaurant?.created_by === member.id;
  const isPerfect = restaurant?.avg_score === 10;

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteRestaurant = async () => {
    try {
      await del(`/api/restaurants/${id}`);
      navigate("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await del(`/api/reviews/${reviewId}`);
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    }
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
          <div className="flex flex-col items-center py-8">
            <Slurms variant="party" size={48} />
            <p className="text-stone-500 text-sm italic mt-3">{randomLoadingMessage()}</p>
          </div>
          <div className="shimmer h-8 w-48 rounded-lg" />
          <div className="shimmer h-4 w-32 rounded" />
          <div className="shimmer h-32 rounded-xl mt-6" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-3">
        <Slurms variant="snarky" size={56} />
        <p className="text-stone-400 font-display font-bold">{SLURMS_QUOTES.error}</p>
      </div>
    );
  }

  const personality = restaurant.avg_score !== null ? scorePersonality(restaurant.avg_score) : null;

  return (
    <div className="min-h-dvh bg-stone-950 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-stone-400 hover:text-stone-200 transition-colors text-base"
            aria-label="Back to restaurant list"
          >
            ← Back
          </button>
          <div className="ml-auto flex items-center gap-1">
            {id && restaurant && (
              <ShareButton token={token} type="restaurant" id={id} name={restaurant.name} />
            )}
            {id && (
              <BookmarkButton
                token={token}
                restaurantId={id}
                isBookmarked={isBookmarked}
                onToggled={refreshBookmarks}
              />
            )}
          </div>
        </div>
      </header>

      {/* Hero photo with gradient overlay */}
      {restaurant.photo_url && (
        <div className="w-full max-h-64 overflow-hidden relative hero-gradient">
          <img
            src={restaurant.photo_url}
            alt={restaurant.name}
            className="w-full h-64 object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      )}

      <div className="px-4 max-w-lg mx-auto">
        {/* Restaurant Info */}
        <div className="py-6">
          <h2 className="font-display font-black text-3xl text-stone-50">{restaurant.name}</h2>
          <div className="flex items-center gap-3 mt-2">
            {restaurant.cuisine && (
              <span className="text-base text-orange-500 font-medium">{restaurant.cuisine}</span>
            )}
            {restaurant.address && (
              <span className="text-base text-stone-500">{restaurant.address}</span>
            )}
          </div>

          {/* Get Directions */}
          {(restaurant.latitude != null && restaurant.longitude != null) && (
            <a
              href={
                restaurant.google_place_id
                  ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${restaurant.google_place_id}`
                  : `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-sm text-stone-300 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              Get Directions
            </a>
          )}

          {/* Average Score with count-up + personality */}
          {animatedScore !== null && (
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className={`font-display font-black text-5xl ${scoreColor(restaurant.avg_score!)}`}>
                  {animatedScore.toFixed(1)}
                </span>
                <span className="text-stone-500 text-base">
                  / 10 from {restaurant.review_count} {restaurant.review_count === 1 ? "review" : "reviews"}
                </span>
              </div>
              {personality && (
                <p className="font-display italic text-sm text-stone-400 mt-1">
                  {personality.emoji} {personality.label}
                </p>
              )}
              {/* Slurms celebrates perfect 10 */}
              {isPerfect && (
                <div className="flex items-center gap-2 mt-2">
                  <Slurms variant="celebrate" size={36} />
                  <span className="text-gold-400 font-display font-bold text-sm italic">
                    {SLURMS_QUOTES.perfect10}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Score Breakdown Bars */}
        {(restaurant.avg_food !== null || restaurant.avg_service !== null || restaurant.avg_ambiance !== null || restaurant.avg_value !== null) && (
          <div className="mb-6 space-y-3">
            <h3 className="font-display font-bold text-sm text-stone-400 uppercase tracking-wider">
              Breakdown
            </h3>
            {[
              { label: "Food", icon: "🍔", value: restaurant.avg_food },
              { label: "Service", icon: "🤝", value: restaurant.avg_service },
              { label: "Ambiance", icon: "🕯️", value: restaurant.avg_ambiance },
              { label: "Value", icon: "💰", value: restaurant.avg_value },
            ]
              .filter((cat) => cat.value !== null)
              .map((cat, i) => (
                <div key={cat.label} className="flex items-center gap-3">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-stone-400 text-sm w-16">{cat.label}</span>
                  <div className="flex-1 h-3 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full animate-bar-fill ${
                        cat.value! >= 8 ? "bg-green-500" : cat.value! >= 6 ? "bg-amber-400" : cat.value! >= 4 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${(cat.value! / 10) * 100}%`, animationDelay: `${i * 0.1}s` }}
                    />
                  </div>
                  <span className={`font-display font-black text-sm w-8 text-right ${scoreColor(cat.value!)}`}>
                    {cat.value!.toFixed(1)}
                  </span>
                </div>
              ))}
          </div>
        )}

        {deleteError && (
          <p className="text-red-500 text-sm text-center mb-4">{deleteError}</p>
        )}

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
                className="text-sm text-stone-500 hover:text-red-400 transition-colors py-2"
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
              token={token}
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
            <div className="text-center py-8 animate-fade-up">
              <Slurms variant="bored" size={44} className="mx-auto" />
              <p className="text-stone-500 text-base mt-3">
                No reviews yet. Be the first!
              </p>
            </div>
          )}

          <div className="space-y-3">
            {restaurant.reviews.map((review: Review, i: number) => (
              <div
                key={review.id}
                className="bg-stone-900 border border-stone-800/50 rounded-xl p-5 animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={review.member_name} size="sm" />
                    <div>
                      <span className="font-medium text-stone-200">{review.member_name}</span>
                      {review.visited_at && (
                        <span className="text-stone-500 text-sm ml-2">
                          {formatDate(review.visited_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`font-display font-black text-xl ${scoreColor(review.overall_score)}`}>
                    {review.overall_score}
                  </span>
                </div>

                {/* Category Scores */}
                {(review.food_score || review.service_score || review.ambiance_score || review.value_score) && (
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {review.food_score && (
                      <span className="text-sm text-stone-400">
                        Food: <span className={scoreColor(review.food_score)}>{review.food_score}</span>
                      </span>
                    )}
                    {review.service_score && (
                      <span className="text-sm text-stone-400">
                        Service: <span className={scoreColor(review.service_score)}>{review.service_score}</span>
                      </span>
                    )}
                    {review.ambiance_score && (
                      <span className="text-sm text-stone-400">
                        Ambiance: <span className={scoreColor(review.ambiance_score)}>{review.ambiance_score}</span>
                      </span>
                    )}
                    {review.value_score && (
                      <span className="text-sm text-stone-400">
                        Value: <span className={scoreColor(review.value_score)}>{review.value_score}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Notes — styled as handwritten note */}
                {review.notes && (
                  <div className="mt-3 bg-stone-800/40 rounded-lg p-3 border-l-2 border-orange-500/30">
                    <p className="text-base text-stone-300 leading-relaxed italic">{review.notes}</p>
                  </div>
                )}

                <PhotoGallery
                  photoUrls={review.photo_urls ?? (review.photo_url ? [review.photo_url] : [])}
                  alt={`${review.member_name}'s photo`}
                />

                {/* Reactions */}
                <ReactionBar
                  token={token}
                  reviewId={review.id}
                  memberId={member.id}
                  reactions={review.reactions ?? []}
                  onReacted={refresh}
                />

                {/* Delete own review */}
                {review.member_id === member.id && (
                  <div className="mt-3 pt-2 border-t border-stone-800/50">
                    {confirmDelete === review.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-sm text-red-400 font-medium py-1"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-sm text-stone-500 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(review.id)}
                        className="text-sm text-stone-500 hover:text-red-400 transition-colors py-1"
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
