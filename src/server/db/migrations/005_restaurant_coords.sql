-- Migration 005: Add latitude/longitude to restaurants for map view
ALTER TABLE restaurants ADD COLUMN latitude REAL;
ALTER TABLE restaurants ADD COLUMN longitude REAL;
