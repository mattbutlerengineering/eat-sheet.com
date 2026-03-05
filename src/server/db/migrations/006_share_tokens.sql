-- Migration 006: Add share tokens for public sharing
ALTER TABLE restaurants ADD COLUMN share_token TEXT UNIQUE;
ALTER TABLE reviews ADD COLUMN share_token TEXT UNIQUE;
