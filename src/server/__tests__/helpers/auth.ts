import { sign } from "hono/jwt";

export const TEST_SECRET = "test-jwt-secret-for-tests";

export const TEST_FAMILY = {
  id: "family-1",
  name: "The Butlers",
  invite_code: "TEST123",
  created_at: "2026-01-01T00:00:00Z",
};

export const TEST_MEMBER = {
  id: "member-1",
  family_id: "family-1",
  name: "Matt",
  is_admin: 1,
  created_at: "2026-01-01T00:00:00Z",
};

export const TEST_MEMBER_2 = {
  id: "member-2",
  family_id: "family-1",
  name: "Sarah",
  is_admin: 0,
  created_at: "2026-01-01T00:00:00Z",
};

export const TEST_RESTAURANT = {
  id: "rest-1",
  family_id: "family-1",
  name: "Pizza Place",
  cuisine: "Italian",
  address: "123 Main St",
  photo_url: null,
  created_by: "member-1",
  created_at: "2026-01-15T00:00:00Z",
};

export const TEST_REVIEW = {
  id: "review-1",
  restaurant_id: "rest-1",
  member_id: "member-1",
  overall_score: 8,
  food_score: 9,
  service_score: 7,
  ambiance_score: 8,
  value_score: 7,
  notes: "Great pizza",
  photo_url: null,
  visited_at: "2026-01-10",
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
};

export async function makeToken(
  overrides: Partial<{
    member_id: string;
    family_id: string;
    name: string;
    is_admin: boolean;
    oauth_provider: string;
    oauth_id: string;
    email: string;
  }> = {}
): Promise<string> {
  return sign(
    {
      member_id: overrides.member_id ?? TEST_MEMBER.id,
      family_id: overrides.family_id ?? TEST_MEMBER.family_id,
      name: overrides.name ?? TEST_MEMBER.name,
      is_admin: overrides.is_admin ?? true,
      ...(overrides.oauth_provider && { oauth_provider: overrides.oauth_provider }),
      ...(overrides.oauth_id && { oauth_id: overrides.oauth_id }),
      ...(overrides.email && { email: overrides.email }),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_SECRET
  );
}

export async function makeRegistrationToken(
  overrides: Partial<{ oauth_provider: string; oauth_id: string; email: string; name: string }> = {}
): Promise<string> {
  return sign(
    {
      oauth_provider: overrides.oauth_provider ?? "google",
      oauth_id: overrides.oauth_id ?? "google-123",
      email: overrides.email ?? "matt@gmail.com",
      name: overrides.name ?? "Matt",
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    TEST_SECRET
  );
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}
