import { Link } from "react-router-dom";
import { useFetch } from "../hooks/useApi";
import { avatarColor } from "../utils/personality";
import { cuisineLabel } from "../utils/cuisines";

interface RecommendationRestaurant {
  readonly id: string;
  readonly name: string;
  readonly cuisine: string | null;
  readonly avg_score: number | null;
}

interface NewCuisineEntry {
  readonly cuisine: string;
  readonly restaurant: RecommendationRestaurant;
}

interface RecommendationsData {
  readonly bookmarked: readonly RecommendationRestaurant[];
  readonly revisit: readonly RecommendationRestaurant[];
  readonly needs_opinions: readonly RecommendationRestaurant[];
  readonly new_cuisines: readonly NewCuisineEntry[];
}

interface RecommendationCardsProps {
  readonly token: string;
}

interface CardConfig {
  readonly key: string;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly items: readonly { readonly id: string; readonly name: string; readonly cuisine: string | null; readonly avg_score: number | null; readonly reason?: string }[];
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-stone-500";
  if (score <= 3) return "text-red-500";
  if (score <= 5) return "text-amber-500";
  if (score <= 7) return "text-amber-400";
  return "text-green-500";
}

const BookmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
  </svg>
);

export function RecommendationCards({ token }: RecommendationCardsProps) {
  const { data, loading } = useFetch<RecommendationsData>(token, "/api/recommendations");

  if (loading || !data) return null;

  const cards: readonly CardConfig[] = [
    ...(data.bookmarked.length > 0
      ? [{
          key: "bookmarked",
          label: "Go try it!",
          icon: <BookmarkIcon />,
          items: data.bookmarked.map((r) => ({ ...r, reason: "You bookmarked this" })),
        }]
      : []),
    ...(data.revisit.length > 0
      ? [{
          key: "revisit",
          label: "Time to revisit",
          icon: <ClockIcon />,
          items: data.revisit.map((r) => ({ ...r, reason: "You loved this" })),
        }]
      : []),
    ...(data.needs_opinions.length > 0
      ? [{
          key: "needs_opinions",
          label: "Needs a 2nd opinion",
          icon: <UsersIcon />,
          items: data.needs_opinions.map((r) => ({ ...r, reason: "Only 1 review" })),
        }]
      : []),
    ...(data.new_cuisines.length > 0
      ? [{
          key: "new_cuisines",
          label: "Try something new",
          icon: <SparklesIcon />,
          items: data.new_cuisines.map((entry) => ({
            ...entry.restaurant,
            reason: `Try ${entry.cuisine}`,
          })),
        }]
      : []),
  ];

  if (cards.length === 0) return null;

  return (
    <div className="pb-3">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">For You</p>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 scrollbar-none">
        {cards.map((card) =>
          card.items.map((item) => (
            <Link
              key={`${card.key}-${item.id}`}
              to={`/restaurant/${item.id}`}
              className="flex-shrink-0 w-44 bg-stone-900 border border-stone-800/50 rounded-xl p-3 hover:border-orange-500/30 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-orange-500 mb-2">
                {card.icon}
                <span className="text-xs font-medium truncate">{card.label}</span>
              </div>
              <p className="text-sm font-display font-bold text-stone-50 truncate">{item.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {item.cuisine && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium text-white/90 ${avatarColor(item.cuisine)}`}>
                    {cuisineLabel(item.cuisine)}
                  </span>
                )}
                {item.avg_score !== null && (
                  <span className={`text-xs font-display font-bold ${scoreColor(item.avg_score)}`}>
                    {item.avg_score.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-stone-500 mt-1.5 truncate">{item.reason}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
