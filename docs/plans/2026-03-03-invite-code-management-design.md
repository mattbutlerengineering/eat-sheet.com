# Invite Code Management Design

## Goal

Allow the family admin (first member) to view and regenerate the invite code from within the app, replacing the current hardcoded seed approach.

## Schema Changes

- Add `is_admin INTEGER NOT NULL DEFAULT 0` to `members` table
- First member to join a family gets `is_admin = 1`
- JWT payload includes `is_admin` so the client can show/hide admin UI

## API Endpoints

- `GET /api/auth/invite-code` — admin-only, returns current invite code
- `POST /api/auth/regenerate-code` — admin-only, generates random 8-char alphanumeric code, updates family, returns new code

## UI

- Settings/share button on restaurant list (admin-only)
- Shows current invite code with copy-to-clipboard
- Regenerate button with confirmation dialog

## Auth Changes

- Add `is_admin` to JWT payload and Member type
- Update join route: set `is_admin = 1` when member is first in family
- Admin check middleware/helper for admin-only endpoints

## Decisions

- **Why is_admin column**: Clean, extensible, fast lookup. Avoids fragile created_at ordering queries.
- **Why admin-only (not all members)**: Prevents accidental code rotation. Admin can share the code directly.
- **Why no new family creation UI**: Out of scope. Families are managed via seed/CLI for now.
