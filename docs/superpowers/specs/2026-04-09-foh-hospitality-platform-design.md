# FOH Hospitality Platform — Design Spec

**Date:** 2026-04-09
**Status:** Draft
**Scope:** Front-of-House (Phase 1 of 4: FOH, BOH, Guest Experience, Analytics)

## Overview

A multi-tenant SaaS hospitality platform for restaurants. Phase 1 covers front-of-house operations: floor plans, tables, reservations, waitlists, guest profiles, service periods, and server assignments.

Built on the existing infrastructure: Hono (Cloudflare Workers) + React 19 + Tailwind v4 + D1 + R2. UI rendering uses json-render for server-driven, role-based dynamic interfaces.

## Architecture Decisions

### Multi-Tenancy

- **Model:** Shared database with row-level isolation (Option C)
- **Mechanism:** Every business table has a `tenant_id` column. A Hono middleware (`tenantScope`) resolves tenant from JWT and injects it into request context. Route handlers never touch `tenant_id` directly — it's always provided via `c.get('tenantId')`.
- **URL pattern:** All tenant-scoped routes under `/api/t/:tenantId/...`. Middleware validates JWT tenant matches URL tenant.

### Auth

- **Provider:** Google OAuth via arctic (existing), JWT via hono/jwt (existing)
- **JWT payload:** `{ userId, tenantId, roleId, permissions[] }`
- **Tenant switching:** `POST /api/auth/switch-tenant` returns a new JWT scoped to the target tenant
- **Middleware chain:** `auth()` → `tenantScope()` → `requirePermission('...')` → handler

### Roles & Permissions

- **Permission-based:** Roles are named collections of permissions, not hardcoded concepts
- **Flexible:** Tenants can create custom roles. System defaults (Owner, Manager, Host, Server, Viewer) are seeded with `tenant_id = NULL` and `is_system = 1`
- **Multi-tenant membership:** A user can belong to multiple tenants with different roles in each

### Build Approach

- **Resource-first:** Define all six FOH resources as CRUD APIs, then layer workflows on top
- **json-render for dynamic UI:** Role-based dashboards and data views rendered from JSON specs. Static pages (login, onboarding) remain normal React.

---

## Section 1: Foundation Models

### `tenants`

The top-level organizational unit. Each restaurant or location is a tenant. All business data is scoped to a tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK, auto-generated | Unique tenant identifier |
| name | TEXT | NOT NULL | Display name ("Mario's Trattoria") |
| slug | TEXT | NOT NULL, UNIQUE | URL-safe identifier ("marios-trattoria") |
| timezone | TEXT | NOT NULL, DEFAULT 'America/New_York' | IANA timezone for this location |
| settings | TEXT | nullable, JSON | Flexible config: currency, date format, branding |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `users`

A person who can log into the system. Users exist independently of tenants — one user can belong to multiple tenants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK, auto-generated | Unique user identifier |
| email | TEXT | NOT NULL, UNIQUE | Login email |
| name | TEXT | NOT NULL | Display name |
| oauth_provider | TEXT | nullable | OAuth provider ('google') |
| oauth_id | TEXT | nullable | Provider-specific user ID |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `tenant_members`

Join table linking users to tenants with a specific role. A user can belong to multiple tenants (e.g., a manager overseeing two locations).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK, auto-generated | Unique membership identifier |
| tenant_id | TEXT | FK → tenants, NOT NULL | Which tenant |
| user_id | TEXT | FK → users, NOT NULL | Which user |
| role_id | TEXT | FK → roles, NOT NULL | Assigned role in this tenant |
| is_owner | INTEGER | NOT NULL, DEFAULT 0 | Whether this user owns the tenant |
| created_at | TEXT | NOT NULL, DEFAULT now | When they joined |
| | | UNIQUE(tenant_id, user_id) | One membership per tenant per user |

### `roles`

Named collections of permissions. System defaults (Owner, Manager, Host, Server, Viewer) are created with `tenant_id = NULL`. Tenants can create custom roles scoped to their organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK, auto-generated | Unique role identifier |
| tenant_id | TEXT | FK → tenants, nullable | NULL = system default, otherwise tenant-specific |
| name | TEXT | NOT NULL | Role name ('host', 'manager', 'floor-lead') |
| description | TEXT | nullable | Human-readable description |
| is_system | INTEGER | NOT NULL, DEFAULT 0 | Prevents tenants from deleting default roles |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `permissions`

System-wide permission definitions. Seeded at deploy time and referenced by roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK, auto-generated | Unique permission identifier |
| key | TEXT | NOT NULL, UNIQUE | Dot-notation key: `reservations.create`, `tables.manage` |
| category | TEXT | NOT NULL | Grouping: 'reservations', 'tables', 'guests', etc. |
| description | TEXT | nullable | What this permission grants |

### `role_permissions`

Join table linking roles to their granted permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role_id | TEXT | FK → roles, NOT NULL | Which role |
| permission_id | TEXT | FK → permissions, NOT NULL | Which permission |
| | | PRIMARY KEY(role_id, permission_id) | One grant per role per permission |

### Default Roles & Permissions

| Role | Key Permissions |
|------|----------------|
| Owner | `*` (all) |
| Manager | `floor.manage`, `reservations.*`, `waitlist.*`, `guests.*`, `shifts.*`, `reports.view`, `staff.manage` |
| Host | `reservations.*`, `waitlist.*`, `guests.view`, `tables.view`, `shifts.view` |
| Server | `tables.view:section`, `guests.view:assigned`, `shifts.view:own` |
| Viewer | `*.view` |

The `:section`, `:assigned`, `:own` suffixes indicate scoped permissions — middleware can enforce these as the system matures.

---

## Section 1: Foundation API Endpoints

### Auth

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/auth/google` | public | Initiate Google OAuth login |
| GET | `/api/auth/google/callback` | public | OAuth callback, returns JWT |
| POST | `/api/auth/refresh` | authenticated | Refresh JWT token |
| GET | `/api/auth/me` | authenticated | Current user profile + tenant memberships |
| POST | `/api/auth/switch-tenant` | authenticated | Switch active tenant, returns new JWT |

### Tenants

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/tenants` | authenticated | Create a new tenant (creator becomes owner) |
| GET | `/api/t/:tenantId` | `tenant.view` | Get tenant details |
| PATCH | `/api/t/:tenantId` | `tenant.manage` | Update tenant name, timezone, settings |

### Team/Members

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/members` | `staff.view` | List all members of this tenant |
| POST | `/api/t/:tenantId/members/invite` | `staff.manage` | Invite a user by email, assign role |
| PATCH | `/api/t/:tenantId/members/:id` | `staff.manage` | Change a member's role |
| DELETE | `/api/t/:tenantId/members/:id` | `staff.manage` | Remove a member from tenant |

### Roles (Custom)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/roles` | `staff.view` | List all roles (system + custom) |
| POST | `/api/t/:tenantId/roles` | `staff.manage` | Create a custom role with permissions |
| PATCH | `/api/t/:tenantId/roles/:id` | `staff.manage` | Update custom role name/permissions |
| DELETE | `/api/t/:tenantId/roles/:id` | `staff.manage` | Delete custom role (must reassign members first) |

### Middleware Chain

```
Request → auth() → tenantScope() → requirePermission('...') → handler
```

1. **`auth()`** — Validates JWT, sets `c.set('userId', ...)` and `c.set('tenantId', ...)`
2. **`tenantScope()`** — Validates JWT `tenantId` matches `:tenantId` URL param, loads member record
3. **`requirePermission(key)`** — Checks the member's role has the required permission. Returns 403 if not.

---

## Section 2: FOH Resource Models

### `floor_plans`

A restaurant may have multiple floor plans (e.g., regular layout vs. private event layout). Only one is active at a time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique floor plan identifier |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant |
| name | TEXT | NOT NULL | "Main Floor", "Event Layout" |
| is_active | INTEGER | NOT NULL, DEFAULT 0 | Whether this is the current active layout |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `sections`

Named zones within a floor plan. Used for server assignments and capacity management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique section identifier |
| floor_plan_id | TEXT | FK → floor_plans, NOT NULL | Parent floor plan |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant (denormalized for query speed) |
| name | TEXT | NOT NULL | "Patio", "Bar", "Main Dining" |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | Display ordering |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `tables`

Individual tables within a floor plan, optionally assigned to a section.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique table identifier |
| floor_plan_id | TEXT | FK → floor_plans, NOT NULL | Parent floor plan |
| section_id | TEXT | FK → sections, nullable | Optional section grouping |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant |
| label | TEXT | NOT NULL | "T1", "Bar 3", "Booth 7" |
| min_capacity | INTEGER | NOT NULL, DEFAULT 1 | Minimum party size |
| max_capacity | INTEGER | NOT NULL, DEFAULT 4 | Maximum party size |
| is_combinable | INTEGER | NOT NULL, DEFAULT 0 | Can be combined with adjacent tables |
| status | TEXT | NOT NULL, DEFAULT 'available' | available, occupied, reserved, blocked |
| position_x | REAL | nullable | X coordinate for visual layout |
| position_y | REAL | nullable | Y coordinate for visual layout |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `guests`

Guest profiles track visit history, preferences, and VIP status. A guest record is tenant-scoped — if the same person visits two restaurants, they have two separate profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique guest identifier |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant |
| name | TEXT | NOT NULL | Guest's name |
| email | TEXT | nullable | Contact email |
| phone | TEXT | nullable | Contact phone |
| tags | TEXT | nullable, JSON array | ["vip", "allergies", "regular"] |
| notes | TEXT | nullable | Free-form notes ("prefers booth", "celiac") |
| visit_count | INTEGER | NOT NULL, DEFAULT 0 | Total visits (denormalized, updated on reservation completion) |
| last_visit_at | TEXT | nullable | Last completed visit timestamp |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `service_periods`

Service periods define when the restaurant is open and with what capacity rules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique service period identifier |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant |
| name | TEXT | NOT NULL | "Lunch", "Dinner", "Sunday Brunch" |
| day_of_week | INTEGER | NOT NULL, 0-6 | 0=Sunday, 6=Saturday |
| start_time | TEXT | NOT NULL | "11:00" (HH:MM, local to tenant timezone) |
| end_time | TEXT | NOT NULL | "14:30" |
| max_reservations | INTEGER | nullable | Cap per period (null = unlimited) |
| reservation_interval | INTEGER | NOT NULL, DEFAULT 15 | Booking slot interval in minutes |
| turn_time | INTEGER | NOT NULL, DEFAULT 90 | Expected average dining duration in minutes |
| is_active | INTEGER | NOT NULL, DEFAULT 1 | Whether this period is currently active |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `reservations`

The core booking resource. Links a guest to a table at a specific time during a service period.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique reservation identifier |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant |
| guest_id | TEXT | FK → guests, NOT NULL | Who is dining |
| table_id | TEXT | FK → tables, nullable | Assigned table (can be null until seated) |
| service_period_id | TEXT | FK → service_periods, nullable | Which service period |
| party_size | INTEGER | NOT NULL | Number of guests |
| date | TEXT | NOT NULL | YYYY-MM-DD |
| time | TEXT | NOT NULL | HH:MM |
| status | TEXT | NOT NULL, DEFAULT 'confirmed' | confirmed, seated, completed, no_show, cancelled |
| notes | TEXT | nullable | Special requests |
| created_by | TEXT | FK → users, NOT NULL | Staff member who created it |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |
| updated_at | TEXT | nullable | Last status change |

### `waitlist_entries`

Walk-in queue management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique waitlist entry identifier |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant |
| guest_id | TEXT | FK → guests, nullable | Linked guest profile (nullable for anonymous walk-ins) |
| guest_name | TEXT | NOT NULL | Name (denormalized for quick display) |
| party_size | INTEGER | NOT NULL | Number of guests |
| phone | TEXT | nullable | For notification when table ready |
| quoted_wait | INTEGER | nullable | Estimated wait in minutes at time of join |
| position | INTEGER | NOT NULL | Queue position |
| status | TEXT | NOT NULL, DEFAULT 'waiting' | waiting, notified, seated, left, cancelled |
| notes | TEXT | nullable | Preferences or special requests |
| checked_in_at | TEXT | NOT NULL, DEFAULT now | When they joined the waitlist |
| seated_at | TEXT | nullable | When they were seated |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

### `server_assignments`

Links servers to sections or specific tables during a shift.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Unique assignment identifier |
| tenant_id | TEXT | FK → tenants, NOT NULL | Owning tenant |
| user_id | TEXT | FK → users, NOT NULL | Which server |
| section_id | TEXT | FK → sections, nullable | Assigned section |
| table_id | TEXT | FK → tables, nullable | Specific table override |
| service_period_id | TEXT | FK → service_periods, NOT NULL | During which service period |
| date | TEXT | NOT NULL | YYYY-MM-DD |
| created_at | TEXT | NOT NULL, DEFAULT now | Creation timestamp |

---

## Section 2: FOH Resource API Endpoints

### Floor Plans & Tables

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/floor-plans` | `floor.view` | List all floor plans |
| POST | `/api/t/:tenantId/floor-plans` | `floor.manage` | Create a new floor plan |
| GET | `/api/t/:tenantId/floor-plans/:id` | `floor.view` | Get floor plan with sections and tables |
| PATCH | `/api/t/:tenantId/floor-plans/:id` | `floor.manage` | Update floor plan (name, set active) |
| DELETE | `/api/t/:tenantId/floor-plans/:id` | `floor.manage` | Delete floor plan (must not be active) |
| POST | `/api/t/:tenantId/floor-plans/:id/sections` | `floor.manage` | Add a section |
| PATCH | `/api/t/:tenantId/sections/:id` | `floor.manage` | Update section |
| DELETE | `/api/t/:tenantId/sections/:id` | `floor.manage` | Remove section |
| POST | `/api/t/:tenantId/floor-plans/:id/tables` | `tables.manage` | Add a table |
| PATCH | `/api/t/:tenantId/tables/:id` | `tables.manage` | Update table |
| DELETE | `/api/t/:tenantId/tables/:id` | `tables.manage` | Remove table |
| PATCH | `/api/t/:tenantId/tables/:id/status` | `tables.update_status` | Quick status change |

### Guests

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/guests` | `guests.view` | List guests (search by name/email/phone, filter by tag) |
| POST | `/api/t/:tenantId/guests` | `guests.create` | Create a guest profile |
| GET | `/api/t/:tenantId/guests/:id` | `guests.view` | Get guest with visit history |
| PATCH | `/api/t/:tenantId/guests/:id` | `guests.update` | Update guest info, tags, notes |
| DELETE | `/api/t/:tenantId/guests/:id` | `guests.delete` | Delete guest profile |
| GET | `/api/t/:tenantId/guests/:id/visits` | `guests.view` | List past reservations for this guest |

### Service Periods

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/service-periods` | `shifts.view` | List all service periods |
| POST | `/api/t/:tenantId/service-periods` | `shifts.manage` | Create a service period |
| PATCH | `/api/t/:tenantId/service-periods/:id` | `shifts.manage` | Update a service period |
| DELETE | `/api/t/:tenantId/service-periods/:id` | `shifts.manage` | Delete a service period |
| GET | `/api/t/:tenantId/service-periods/today` | `shifts.view` | Get today's active service periods |
| GET | `/api/t/:tenantId/service-periods/current` | `shifts.view` | Get the currently active service period |

### Reservations

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/reservations` | `reservations.view` | List reservations (filter by date, status, guest) |
| POST | `/api/t/:tenantId/reservations` | `reservations.create` | Create a reservation |
| GET | `/api/t/:tenantId/reservations/:id` | `reservations.view` | Get reservation details with guest + table |
| PATCH | `/api/t/:tenantId/reservations/:id` | `reservations.update` | Update reservation |
| PATCH | `/api/t/:tenantId/reservations/:id/status` | `reservations.update` | Change status (seat, complete, no-show, cancel) |
| DELETE | `/api/t/:tenantId/reservations/:id` | `reservations.delete` | Delete reservation |
| GET | `/api/t/:tenantId/reservations/availability` | `reservations.view` | Check available slots for a date + party size |

### Waitlist

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/waitlist` | `waitlist.view` | Get current waitlist (ordered by position) |
| POST | `/api/t/:tenantId/waitlist` | `waitlist.create` | Add a party to the waitlist |
| PATCH | `/api/t/:tenantId/waitlist/:id` | `waitlist.update` | Update entry |
| PATCH | `/api/t/:tenantId/waitlist/:id/status` | `waitlist.update` | Change status (notify, seat, remove) |
| DELETE | `/api/t/:tenantId/waitlist/:id` | `waitlist.delete` | Remove from waitlist |
| POST | `/api/t/:tenantId/waitlist/reorder` | `waitlist.manage` | Reorder the waitlist |
| GET | `/api/t/:tenantId/waitlist/estimate` | `waitlist.view` | Get estimated wait for a party size |

### Server Assignments

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/assignments` | `staff.view` | List assignments (filter by date, server, section) |
| POST | `/api/t/:tenantId/assignments` | `staff.manage` | Create an assignment |
| PATCH | `/api/t/:tenantId/assignments/:id` | `staff.manage` | Update assignment |
| DELETE | `/api/t/:tenantId/assignments/:id` | `staff.manage` | Remove assignment |
| GET | `/api/t/:tenantId/assignments/today` | `staff.view` | Get today's assignments with server names |

### Dashboard

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/t/:tenantId/dashboard` | authenticated | Returns a json-render spec based on user's role |

---

## Section 3: Workflows & State Transitions

### Reservation Lifecycle

```
[created] → confirmed → seated → completed
                │          │
                ├→ cancelled  ├→ no_show
                └→ no_show
```

| Transition | Trigger | Side Effects |
|-----------|---------|--------------|
| → `confirmed` | Staff creates reservation | Table marked `reserved` for the time slot |
| → `seated` | Guest arrives, host seats them | Table → `occupied`, guest `visit_count` incremented |
| → `completed` | Party leaves | Table → `available`, `last_visit_at` updated on guest |
| → `no_show` | Past reservation time, guest didn't arrive | Table → `available`, no_show logged on guest |
| → `cancelled` | Guest or staff cancels | Table → `available` if it was reserved |

**Validation rules:**
- Cannot double-book a table for overlapping time slots (considering `turn_time`)
- Party size must fit within table's `min_capacity`–`max_capacity`
- Reservation time must fall within an active service period
- Cannot seat at an `occupied` or `blocked` table

### Waitlist Flow

```
[added] → waiting → notified → seated
              │         │
              └→ left   └→ left
                        └→ cancelled
```

| Transition | Trigger | Side Effects |
|-----------|---------|--------------|
| → `waiting` | Walk-in party added | Position assigned, wait estimate calculated |
| → `notified` | Table available for party size | Guest notified |
| → `seated` | Host seats the party | Creates reservation (type: walk-in), table → `occupied`, removed from waitlist |
| → `left` | Guest leaves before seated | Entry closed, positions rebalanced |
| → `cancelled` | Staff removes entry | Positions rebalanced |

**Wait estimate algorithm:**
- Count parties ahead with same or smaller party size
- Multiply by average `turn_time` from current service period
- Factor in number of compatible tables (`max_capacity >= party_size`)

### Table Status Flow

```
available ←→ reserved
    ↕            ↓
 blocked      occupied
                 ↓
             available
```

| Status | Meaning | Who Can Set |
|--------|---------|-------------|
| `available` | Ready for seating | System (auto), host, manager |
| `reserved` | Held for upcoming reservation | System (auto on confirm) |
| `occupied` | Currently in use | System (auto on seat), host |
| `blocked` | Temporarily unavailable | Host, manager |

### Service Period Status (Computed)

| Status | Meaning |
|--------|---------|
| `upcoming` | Starts within 2 hours |
| `active` | Current time within start–end |
| `completed` | Past end_time |

Derived from current time vs. `start_time`/`end_time` in tenant timezone. Not stored.

---

## Section 4: json-render Integration

### Strategy

Hybrid approach: static pages (login, onboarding) are normal React. Dynamic, role-based views (dashboard, floor plan, reservations list) are rendered from json-render specs returned by the API.

### Component Catalog

Defined in `src/client/catalog/` using `defineCatalog()` with Zod schemas. Component groups:

- **Tables:** TableCard, TableGrid, FloorPlanView
- **Reservations:** ReservationRow, ReservationTimeline, AvailabilityGrid
- **Waitlist:** WaitlistEntry, WaitlistQueue
- **Guests:** GuestCard, GuestProfile, VisitHistory
- **Common:** StatCard, DataTable, EmptyState, ActionButton, Badge, StatusIndicator
- **Layout:** PageHeader, SplitPane, TabGroup, CardGrid

### Component Registry

Defined in `src/client/registry/` using `defineRegistry()`. Maps catalog definitions to React + Tailwind implementations.

### Spec Delivery

API endpoints return json-render specs via `GET /api/t/:tenantId/dashboard` (and other view endpoints). Specs embed live data as component props.

### Role-Based Dashboards

| Role | Dashboard Contains |
|------|-------------------|
| Host | Current waitlist, upcoming reservations (next 2 hrs), floor plan with table statuses, quick-seat actions |
| Manager | Today's reservation count, covers forecast, waitlist length, floor plan overview, staff assignments |
| Server | Assigned section, current tables with guest info, upcoming reservations for their tables |
| Owner | High-level stats + manager view |

### Client Integration

```tsx
// src/client/pages/Dashboard.tsx
const { spec } = useSpec(`/api/t/${tenantId}/dashboard`);
return <Renderer registry={fohRegistry} spec={spec} />;
```

### Package

`@json-render/react` — core React renderer. Custom catalog + registry (no shadcn preset — we build our own Tailwind components).

---

## Section 5: Project Structure

```
src/
├── server/
│   ├── index.ts                    # Hono app entry, route mounting
│   ├── middleware/
│   │   ├── auth.ts                 # JWT validation, user context
│   │   ├── tenant.ts               # Tenant scoping, tenant_id injection
│   │   └── permission.ts           # Role/permission checking
│   ├── routes/
│   │   ├── auth.ts                 # OAuth, JWT, tenant switching
│   │   ├── tenants.ts              # Tenant CRUD
│   │   ├── members.ts              # Team management, invites
│   │   ├── roles.ts                # Role + permission management
│   │   ├── floor-plans.ts          # Floor plans, sections, tables
│   │   ├── guests.ts               # Guest profiles
│   │   ├── service-periods.ts      # Shift definitions
│   │   ├── reservations.ts         # Reservation CRUD + lifecycle
│   │   ├── waitlist.ts             # Waitlist management
│   │   ├── assignments.ts          # Server-to-section assignments
│   │   └── dashboard.ts            # Role-based dashboard specs
│   ├── db/
│   │   ├── schema.sql              # Full schema
│   │   └── migrations/             # Incremental migrations
│   ├── services/
│   │   ├── reservation-service.ts  # Reservation business logic + state transitions
│   │   ├── waitlist-service.ts     # Waitlist business logic + state transitions
│   │   ├── table-service.ts        # Table status management
│   │   └── availability-service.ts # Slot availability calculations
│   └── __tests__/
│       ├── helpers/
│       │   ├── mock-db.ts          # D1 mock (partial SQL matching)
│       │   ├── mock-r2.ts          # R2 mock (in-memory Map)
│       │   └── auth.ts             # JWT helper (makeToken, authHeader)
│       ├── auth.test.ts
│       ├── tenants.test.ts
│       ├── floor-plans.test.ts
│       ├── guests.test.ts
│       ├── service-periods.test.ts
│       ├── reservations.test.ts
│       ├── waitlist.test.ts
│       └── assignments.test.ts
├── client/
│   ├── main.tsx                    # App entry
│   ├── App.tsx                     # Router setup
│   ├── catalog/
│   │   ├── index.ts                # defineCatalog()
│   │   └── schemas/
│   │       ├── tables.ts
│   │       ├── reservations.ts
│   │       ├── waitlist.ts
│   │       ├── guests.ts
│   │       └── common.ts
│   ├── registry/
│   │   ├── index.ts                # defineRegistry()
│   │   └── components/
│   │       ├── TableCard.tsx
│   │       ├── ReservationRow.tsx
│   │       ├── WaitlistEntry.tsx
│   │       ├── GuestProfile.tsx
│   │       ├── FloorPlanGrid.tsx
│   │       ├── StatCard.tsx
│   │       └── ...
│   ├── components/                 # Traditional React (non-spec)
│   │   ├── Layout.tsx
│   │   ├── Nav.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── Login.tsx               # Static
│   │   ├── Dashboard.tsx           # json-render spec
│   │   ├── FloorPlan.tsx           # json-render spec
│   │   ├── Reservations.tsx        # json-render spec
│   │   ├── Waitlist.tsx            # json-render spec
│   │   ├── Guests.tsx              # json-render spec
│   │   └── Settings.tsx            # Hybrid
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts
│   │   └── useSpec.ts              # Fetches + caches json-render specs
│   ├── utils/
│   └── types/
└── shared/
    └── permissions.ts              # Permission key constants (server + client)
```

### Dependencies (additions)

```
@json-render/react        # Core json-render for React
zod                       # Schema validation (catalog + API input)
```

### Infrastructure Preserved (No Changes)

- `wrangler.toml` — D1 binding, R2 binding, Workers config
- `vite.config.ts` — React + Tailwind + PWA (update manifest name/description only)
- `vitest.config.ts` / `playwright.config.ts` — test setup
- Cloudflare Workers deploy pipeline
- Sentry, PostHog integrations

---

## Section 6: API Response Format

All API responses use a consistent envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}
```

Paginated list endpoints accept `?page=1&limit=25` query params.

---

## Section 7: Future Phases (Out of Scope)

For context only — not part of this spec:

- **Phase 2: Back-of-House** — Kitchen orders, inventory, staff scheduling
- **Phase 3: Guest Experience** — Digital menus, ordering, payments, feedback
- **Phase 4: Analytics** — Reporting, performance tracking, CRM

Each phase will get its own design spec and implementation plan.

---

## Open Questions

None — all architectural decisions resolved during brainstorming.
