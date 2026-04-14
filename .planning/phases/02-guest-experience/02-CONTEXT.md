# Phase 2: Guest Experience - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhanced guest communication and preferences for the FOH hospitality platform. This phase adds: SMS/email notifications, guest allergies and preferences, VIP tiers, special occasion tracking, table combining for large parties, and real-time table timers.

</domain>

<decisions>
## Implementation Decisions

### Guest Allergies & Dietary Preferences
- Track via **tags approach** — use tags like `allergy:gluten`, `dietary:vegetarian`
- Store in existing `tags` field on guest record
- No dedicated fields needed — tags are flexible and searchable

### VIP Status
- **Tiered levels** (not simple boolean): Regular → VIP → Priority
- Add `vip_tier` field to guest record
- Higher tiers get priority seating and special handling

### Special Occasions
- **Dedicated date fields** for birthday and anniversary
- Add `birthday` and `anniversary` fields to guest schema
- Dashboard **auto-displays** guests with upcoming special occasions (within 7 days)

### Table Combining
- **Persistent combined tables** — create new combined table entry in floor plan
- When party size is 5+, suggest/combine tables
- Combined tables show as single entity with merged capacity (sum of child tables)

### Real-Time Table Timer
- Display elapsed time when table is occupied
- Claude has discretion on exact implementation (elapsed minutes, color coding, etc.)

### Claude's Discretion
- Exact timer display format (minutes only vs hours:minutes)
- Color scheme for timer states
- How to surface VIP/Priority guests in reservation list

</decisions>

<specifics>
## Specific Ideas

- Tags for allergies should be searchable/filterable: `allergy:*`
- VIP tiers should affect sort order in reservation list (Priority first)
- Combined tables maintain reference to child tables for later un-combining

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Guest schema already exists at `src/server/types.ts` with `tags` field
- Tags are stored as JSON string in `tags` column
- Reservation lifecycle service exists at `src/server/services/reservation-service.ts`
- Table status transitions in `src/server/services/table-service.ts`

### Established Patterns
- Tags are comma-separated strings searched via LIKE
- Status transitions use state machine pattern
- API returns `{ success: boolean, data?: T, error?: string }` envelope

### Integration Points
- New guest fields add to existing guest schema/types
- VIP status affects reservation sorting in existing reservation routes
- Timer uses existing table status and updates on state transitions

</code_context>

<deferred>
## Deferred Ideas

- Notifications (SMS/email) — not discussed in this session
- Floor plan versioning — not discussed in this session

</deferred>

---

*Phase: 02-guest-experience*
*Context gathered: 2026-04-11*