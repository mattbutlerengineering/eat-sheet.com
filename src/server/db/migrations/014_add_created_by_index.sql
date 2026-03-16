-- Add index on restaurants.created_by, used in every query via visiblePeersCte()
CREATE INDEX IF NOT EXISTS idx_restaurants_created_by ON restaurants(created_by);
