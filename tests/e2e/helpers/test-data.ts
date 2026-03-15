export const TEST_MEMBER = {
  id: "member-001",
  name: "Test Butler",
  email: "test@example.com",
} as const;

export const TEST_AUTH = {
  token: "fake-jwt-token-for-e2e",
  member: TEST_MEMBER,
} as const;

export const TEST_RESTAURANTS = [
  {
    id: "rest-001",
    name: "Taco Palace",
    cuisine: "Mexican",
    address: "123 Main St",
    photo_url: null,
    latitude: 40.7128,
    longitude: -74.006,
    google_place_id: null,
    created_by: "member-001",
    created_at: "2025-12-01T12:00:00Z",
    avg_score: 8.5,
    review_count: 3,
    creator_name: "Test Butler",
    last_visited_at: "2025-12-15T18:00:00Z",
    bookmark_count: 1,
  },
  {
    id: "rest-002",
    name: "Sushi World",
    cuisine: "Japanese",
    address: "456 Oak Ave",
    photo_url: null,
    latitude: 40.7138,
    longitude: -74.007,
    google_place_id: null,
    created_by: "member-002",
    created_at: "2025-11-20T10:00:00Z",
    avg_score: 7.2,
    review_count: 2,
    creator_name: "Jane Butler",
    last_visited_at: "2025-12-10T19:00:00Z",
    bookmark_count: 0,
  },
  {
    id: "rest-003",
    name: "Pizza Roma",
    cuisine: "Italian",
    address: "789 Elm St",
    photo_url: null,
    latitude: 40.7148,
    longitude: -74.008,
    google_place_id: null,
    created_by: "member-001",
    created_at: "2025-10-15T14:00:00Z",
    avg_score: 6.0,
    review_count: 1,
    creator_name: "Test Butler",
    last_visited_at: null,
    bookmark_count: 2,
  },
] as const;

export const TEST_REVIEWS = [
  {
    id: "rev-001",
    restaurant_id: "rest-001",
    member_id: "member-001",
    member_name: "Test Butler",
    overall_score: 9,
    food_score: 9,
    service_score: 8,
    ambiance_score: 7,
    value_score: 8,
    notes: "Amazing tacos, best in town!",
    photo_url: null,
    photo_urls: [],
    visited_at: "2025-12-15",
    created_at: "2025-12-15T18:00:00Z",
    updated_at: "2025-12-15T18:00:00Z",
    reactions: [],
  },
  {
    id: "rev-002",
    restaurant_id: "rest-001",
    member_id: "member-002",
    member_name: "Jane Butler",
    overall_score: 8,
    food_score: 8,
    service_score: 7,
    ambiance_score: 8,
    value_score: 7,
    notes: "Really enjoyed the al pastor",
    photo_url: null,
    photo_urls: [],
    visited_at: "2025-12-10",
    created_at: "2025-12-10T19:00:00Z",
    updated_at: "2025-12-10T19:00:00Z",
    reactions: [{ emoji: "🔥", member_id: "member-001", member_name: "Test Butler" }],
  },
] as const;

export const TEST_RESTAURANT_DETAIL = {
  ...TEST_RESTAURANTS[0],
  avg_food: 8.5,
  avg_service: 7.5,
  avg_ambiance: 7.5,
  avg_value: 7.5,
  reviews: TEST_REVIEWS,
} as const;

export const TEST_ACTIVITY = [
  {
    id: "act-001",
    type: "review_added" as const,
    member_name: "Test Butler",
    restaurant_id: "rest-001",
    restaurant_name: "Taco Palace",
    score: 9,
    timestamp: "2025-12-15T18:00:00Z",
  },
  {
    id: "act-002",
    type: "restaurant_added" as const,
    member_name: "Jane Butler",
    restaurant_id: "rest-002",
    restaurant_name: "Sushi World",
    score: null,
    timestamp: "2025-11-20T10:00:00Z",
  },
] as const;

export const TEST_STATS = {
  total_restaurants: 3,
  total_reviews: 5,
  members: [
    { member_id: "member-001", name: "Test Butler", review_count: 3, avg_score: 8.0 },
    { member_id: "member-002", name: "Jane Butler", review_count: 2, avg_score: 7.5 },
  ],
  cuisine_breakdown: [
    { cuisine: "Mexican", count: 1 },
    { cuisine: "Japanese", count: 1 },
    { cuisine: "Italian", count: 1 },
  ],
  category_averages: {
    food: 8.5,
    service: 7.5,
    ambiance: 7.5,
    value: 7.5,
  },
} as const;

export const TEST_SHARED_RESTAURANT = {
  id: "rest-001",
  name: "Taco Palace",
  cuisine: "Mexican",
  address: "123 Main St",
  avg_score: 8.5,
  review_count: 3,
  reviews: TEST_REVIEWS,
} as const;

export const TEST_BOOKMARKS = [{ id: "rest-001" }] as const;
