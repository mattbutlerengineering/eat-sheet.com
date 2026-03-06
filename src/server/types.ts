export interface Group {
  readonly id: string;
  readonly name: string;
  readonly invite_code: string;
  readonly created_by: string;
  readonly created_at: string;
}

export interface GroupMember {
  readonly id: string;
  readonly group_id: string;
  readonly member_id: string;
  readonly is_admin: number;
  readonly joined_at: string;
}

export interface Member {
  readonly id: string;
  readonly family_id: string;
  readonly name: string;
  readonly is_admin: number;
  readonly oauth_provider: string | null;
  readonly oauth_id: string | null;
  readonly email: string | null;
  readonly created_at: string;
}

export interface Restaurant {
  readonly id: string;
  readonly family_id: string;
  readonly name: string;
  readonly cuisine: string | null;
  readonly address: string | null;
  readonly photo_url: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly share_token: string | null;
  readonly google_place_id: string | null;
  readonly created_by: string;
  readonly created_at: string;
}

export interface Review {
  readonly id: string;
  readonly restaurant_id: string;
  readonly member_id: string;
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

export interface JwtPayload {
  readonly member_id: string;
  readonly name: string;
  readonly exp: number;
  // Legacy fields — present in old tokens, ignored in new ones
  readonly family_id?: string;
  readonly is_admin?: boolean;
}

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  PHOTOS: R2Bucket;
  GOOGLE_PLACES_API_KEY: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  OAUTH_REDIRECT_BASE: string;
  SENTRY_DSN: string;
}
