---
phase: 02-guest-experience
plan: 02
subsystem: api
tags: [floor-plan, tables, timer, combining]

# Dependency graph
requires:
  - phase: 02-guest-experience
    provides: floor plans, table CRUD
provides:
  - Table combining/un-combining API endpoints
  - Real-time occupied timer tracking
  - UI timer display with color coding
affects: [reservations, floor-plan]

# Tech tracking
added: []
patterns: [combined_from for table relation, occupied_since for timer]

key-files:
  created: []
  modified:
    - src/server/db/schema.sql
    - src/server/types.ts
    - src/server/routes/floor-plans.ts
    - src/server/services/table-service.ts
    - src/client/registry/components/TableCard.tsx
    - src/client/registry/components/FloorPlanGrid.tsx

key-decisions:
  - "Combined tables use persistent entry with combined_from storing child table IDs"
  - Timer calculated from reservation seated_at for accuracy"
  - "Timer display: green < 60min, yellow 60-90min, red > 90min"

patterns-established:
  - "Combined tables: create new table entry, hide child tables"

requirements-completed: [FLOOR-05, FLOOR-07]

# Metrics
duration: 10 min
completed: 2026-04-12
---

# Phase 2 Plan 2: Table Combining & Timer Summary

**Table combining with real-time occupied timer display, enabling large party seating and table turnover management**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-12T02:41:36Z
- **Completed:** 2026-04-12T02:51:36Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Schema and types support table combining (combined_from) and timer tracking (occupied_since)
- API endpoints for POST /combine and POST /uncombine, plus GET with occupied_since
- UI displays elapsed time with color coding on occupied tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Add table combining to schema and types** - `b4c7069` (feat)
2. **Task 2: Add table combining API endpoints** - `b0e6335` (feat)
3. **Task 3: Add real-time table timer to UI** - `1bf8ffa` (feat)

**Plan metadata:** `lmn012o` (docs: complete plan)

## Files Created/Modified
- `src/server/db/schema.sql` - Added combined_from and occupied_since columns
- `src/server/types.ts` - Updated Table interface with new fields
- `src/server/routes/floor-plans.ts` - Added combine/uncombine endpoints, GET with occupied_since
- `src/server/services/table-service.ts` - Track occupied_since on status transitions
- `src/client/registry/components/TableCard.tsx` - Timer display with color coding
- `src/client/registry/components/FloorPlanGrid.tsx` - Pass occupiedSince and combinedFrom props

## Decisions Made
- Combined tables are persistent entries with combined_from storing comma-separated child table IDs
- Timer calculated from reservation seated_at for accurate turnover tracking
- Color scheme: green (< 60 min), yellow (60-90 min), red (> 90 min)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- Table combining and timer complete for Phase 2
- Ready for Phase 3: Analytics & reporting

---
*Phase: 02-guest-experience*
*Completed: 2026-04-12*