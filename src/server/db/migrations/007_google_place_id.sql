-- Migration 007: Add Google Place ID for restaurant deduplication and directions
ALTER TABLE restaurants ADD COLUMN google_place_id TEXT;
CREATE INDEX idx_restaurants_google_place_id ON restaurants(google_place_id);
