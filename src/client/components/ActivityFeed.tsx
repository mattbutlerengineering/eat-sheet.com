import { useNavigate } from "react-router-dom";
import { useFetch } from "../hooks/useApi";
import { MemberAvatar } from "./MemberAvatar";
import { Slurms } from "./Slurms";
import { SLURMS_QUOTES, randomLoadingMessage } from "../utils/personality";
import { relativeTime } from "../utils/time";
import type { ActivityEvent } from "../types";

interface ActivityFeedProps {
  readonly token: string;
  readonly embedded?: boolean;
}

function activityDescription(event: ActivityEvent): string {
  switch (event.type) {
    case "restaurant_added":
      return `discovered ${event.restaurant_name}`;
    case "review_added":
      return `rated ${event.restaurant_name} a ${event.score}`;
    case "review_updated":
      return `updated their review of ${event.restaurant_name} to ${event.score}`;
  }
}

function activityEmoji(event: ActivityEvent): string {
  switch (event.type) {
    case "restaurant_added":
      return "🍽️";
    case "review_added":
      return event.score !== null && event.score >= 8 ? "🔥" : "📝";
    case "review_updated":
      return "✏️";
  }
}

export function ActivityFeed({ token, embedded = false }: ActivityFeedProps) {
  const { data: events, loading, error } = useFetch<readonly ActivityEvent[]>(token, "/api/activity");
  const navigate = useNavigate();

  return (
    <div className={embedded ? "" : "min-h-dvh bg-stone-950 pb-20"}>
      {!embedded && (
        <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50">
          <div className="px-4 py-4">
            <h1 className="font-display text-xl font-black text-orange-500 italic">Activity</h1>
          </div>
        </header>
      )}

      <div className={embedded ? "py-2" : "px-4 py-4"}>
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-12">
            <Slurms variant="party" size={48} />
            <p className="text-stone-500 text-sm italic mt-3">{randomLoadingMessage()}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && error && (
          <div className="flex flex-col items-center py-16 animate-fade-up">
            <Slurms variant="snarky" size={56} />
            <p className="text-stone-300 font-display font-bold mt-4">Something went wrong</p>
            <p className="text-stone-500 text-sm mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && (!events || events.length === 0) && (
          <div className="flex flex-col items-center py-16 animate-fade-up">
            <Slurms variant="bored" size={56} />
            <p className="text-stone-300 font-display font-bold text-lg mt-4 text-center">
              No activity yet
            </p>
            <p className="text-stone-500 text-sm mt-2 text-center max-w-xs">
              When you or your groups add restaurants and leave reviews, activity will show up here.
            </p>
            <p className="text-stone-600 text-xs mt-3 italic text-center">
              {SLURMS_QUOTES.empty}
            </p>
          </div>
        )}

        {/* Feed Items */}
        <div className="space-y-3">
          {events?.map((event, i) => (
            <button
              key={`${event.type}-${event.id}`}
              onClick={() => navigate(`/restaurant/${event.restaurant_id}`)}
              className="w-full text-left card-warm bg-stone-900 border border-stone-800/50 rounded-xl p-4 animate-fade-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex items-start gap-3">
                <MemberAvatar name={event.member_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-stone-200 text-sm">
                    <span className="font-medium">{event.member_name}</span>{" "}
                    <span className="text-stone-400">{activityDescription(event)}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs">{activityEmoji(event)}</span>
                    <span className="text-xs text-stone-500">{relativeTime(event.timestamp)}</span>
                  </div>
                </div>
                {event.score !== null && (
                  <span className={`font-display font-black text-lg ${
                    event.score >= 8 ? "text-green-500" : event.score >= 6 ? "text-amber-400" : "text-amber-500"
                  }`}>
                    {event.score}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
