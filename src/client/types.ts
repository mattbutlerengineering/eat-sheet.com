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
  readonly visited_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface RestaurantDetail extends Restaurant {
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

export interface ApiResponse<T> {
  readonly data?: T;
  readonly error?: string;
}
