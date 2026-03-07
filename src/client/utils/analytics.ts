import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

export function initAnalytics(): void {
  if (!POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    autocapture: true,
    capture_pageview: false,
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.debug();
      }
    },
  });
}

function isReady(): boolean {
  return !!POSTHOG_KEY && posthog.__loaded;
}

export function identifyUser(id: string, name: string): void {
  if (!isReady()) return;
  posthog.identify(id, { name });
}

export function resetUser(): void {
  if (!isReady()) return;
  posthog.reset();
}

export function trackPageView(path: string): void {
  if (!isReady()) return;
  posthog.capture("$pageview", { $current_url: path });
}

export type AnalyticsEvent =
  | "nav_tab_clicked"
  | "feature_opened"
  | "feature_closed"
  | "sizzle_swipe"
  | "tonight_mode_selected"
  | "tonight_suggestion_accepted"
  | "tonight_suggestion_skipped"
  | "picker_spin"
  | "picker_result_accepted"
  | "restaurant_created"
  | "review_submitted"
  | "review_edited"
  | "bookmark_toggled"
  | "reaction_toggled"
  | "restaurant_shared"
  | "review_shared"
  | "view_mode_changed"
  | "sort_mode_changed"
  | "cuisine_filter_applied"
  | "search_used"
  | "discover_tab_changed"
  | "nearby_place_added"
  | "directions_clicked";

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!isReady()) return;
  posthog.capture(event, properties);
}
