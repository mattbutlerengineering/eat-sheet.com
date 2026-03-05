export interface Member {
  readonly id: string;
  readonly family_id: string;
  readonly name: string;
  readonly is_admin: boolean;
}

export interface Restaurant {
  readonly id: string;
  readonly name: string;
  readonly cuisine: string | null;
  readonly address: string | null;
  readonly photo_url: string | null;
  readonly created_by: string;
  readonly created_at: string;
  readonly avg_score: number | null;
  readonly review_count: number;
  readonly creator_name?: string;
  readonly last_visited_at?: string | null;
}

export interface Review {
  readonly id: string;
  readonly restaurant_id: string;
  readonly member_id: string;
  readonly member_name: string;
  readonly overall_score: number;
  readonly food_score: number | null;
  readonly service_score: number | null;
  readonly ambiance_score: number | null;
  readonly value_score: number | null;
  readonly notes: string | null;
  readonly photo_url: string | null;
  readonly photo_urls?: readonly string[];
  readonly visited_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly reactions?: readonly Reaction[];
}

export interface Reaction {
  readonly emoji: string;
  readonly member_id: string;
  readonly member_name: string;
}

export interface RestaurantDetail extends Restaurant {
  readonly avg_food: number | null;
  readonly avg_service: number | null;
  readonly avg_ambiance: number | null;
  readonly avg_value: number | null;
  readonly reviews: readonly Review[];
}

export interface AuthState {
  readonly token: string;
  readonly member: Member;
}

export interface ActivityEvent {
  readonly id: string;
  readonly type: "restaurant_added" | "review_added" | "review_updated";
  readonly member_name: string;
  readonly restaurant_id: string;
  readonly restaurant_name: string;
  readonly score: number | null;
  readonly timestamp: string;
}

export interface MemberStats {
  readonly name: string;
  readonly review_count: number;
  readonly avg_score: number | null;
}

export interface FamilyStatsData {
  readonly total_restaurants: number;
  readonly total_reviews: number;
  readonly members: readonly MemberStats[];
  readonly cuisine_breakdown: readonly { readonly cuisine: string; readonly count: number }[];
  readonly category_averages: {
    readonly food: number | null;
    readonly service: number | null;
    readonly ambiance: number | null;
    readonly value: number | null;
  };
}

export interface ApiResponse<T> {
  readonly data?: T;
  readonly error?: string;
}
