# Requirements: eat-sheet.com

**Defined:** 2026-04-11
**Core Value:** Enable restaurant staff to manage front-of-house operations (reservations, waitlist, table assignments, guest profiles) through a role-based interface with real-time floor plan visualization.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up/login via Google OAuth
- [ ] **AUTH-02**: JWT session persists across requests
- [ ] **AUTH-03**: User can switch between multiple tenant memberships

### Multi-Tenancy

- [ ] **TENANT-01**: Tenant creation with name, slug, timezone
- [ ] **TENANT-02**: Tenant-scoped data isolation via tenant_id
- [ ] **TENANT-03**: Tenant switching returns new JWT

### Roles & Permissions

- [ ] **ROLE-01**: System default roles (Owner, Manager, Host, Server, Viewer)
- [ ] **ROLE-02**: Custom role creation with permission assignments
- [ ] **ROLE-03**: Permission-based route protection

### Floor Plans

- [ ] **FLOOR-01**: Create floor plan with name
- [ ] **FLOOR-02**: Activate/deactivate floor plans (one active at a time)
- [ ] **FLOOR-03**: Delete inactive floor plan
- [ ] **FLOOR-04**: Get floor plan with sections and tables

### Sections

- [ ] **SECT-01**: Create section within floor plan
- [ ] **SECT-02**: Update section name and sort order
- [ ] **SECT-03**: Delete section

### Tables

- [ ] **TABLE-01**: Create table with label, capacity range
- [ ] **TABLE-02**: Update table properties
- [ ] **TABLE-03**: Delete table
- [ ] **TABLE-04**: Change table status (available, reserved, occupied, blocked)
- [ ] **TABLE-05**: Table position coordinates for visual layout

### Guests

- [ ] **GUEST-01**: Create guest profile (name, email, phone)
- [ ] **GUEST-02**: Search guests by name/email/phone
- [ ] **GUEST-03**: Filter guests by tags
- [ ] **GUEST-04**: Update guest profile
- [ ] **GUEST-05**: Delete guest profile
- [ ] **GUEST-06**: View guest visit history
- [ ] **GUEST-07**: Track visit count and last visit date

### Service Periods

- [ ] **SVC-01**: Create service period (name, day, time range, interval, turn_time)
- [ ] **SVC-02**: Update service period
- [ ] **SVC-03**: Delete service period
- [ ] **SVC-04**: Get today's service periods
- [ ] **SVC-05**: Get currently active service period

### Reservations

- [ ] **RESV-01**: Create reservation (guest, party_size, date, time, table_id)
- [ ] **RESV-02**: List reservations with filters (date, status, guest)
- [ ] **RESV-03**: Get single reservation
- [ ] **RESV-04**: Update reservation details
- [ ] **RESV-05**: Change reservation status (confirmed → seated → completed)
- [ ] **RESV-06**: Cancel reservation
- [ ] **RESV-07**: Mark as no-show
- [ ] **RESV-08**: Check availability for date/party_size

### Waitlist

- [ ] **WAIT-01**: Add party to waitlist
- [ ] **WAIT-02**: Get current waitlist
- [ ] **WAIT-03**: Update waitlist entry
- [ ] **WAIT-04**: Change waitlist status (waiting → notified → seated)
- [ ] **WAIT-05**: Remove from waitlist
- [ ] **WAIT-06**: Reorder waitlist positions
- [ ] **WAIT-07**: Get estimated wait for party size

### Server Assignments

- [ ] **ASSIGN-01**: Create server assignment (user, section/table, service_period, date)
- [ ] **ASSIGN-02**: List assignments with filters
- [ ] **ASSIGN-03**: Get today's assignments with server names
- [ ] **ASSIGN-04**: Update assignment
- [ ] **ASSIGN-05**: Delete assignment

### Dashboard

- [ ] **DASH-01**: Get dashboard stats (reservations today, waitlist length, table status counts)
- [ ] **DASH-02**: Role-based json-render spec generation

## v2 Requirements

### Notifications

- **NOTF-01**: SMS notification when table ready
- **NOTF-02**: Email confirmation for reservations

### Reservations

- **RESV-09**: Recurring reservations
- **RESV-10**: Deposit/prepayment collection
- **RESV-11**: Reservation modification requests

### Guest Experience

- **GUEST-08**: Guest preferences (allergies, seating preferences)
- **GUEST-09**: VIP tagging
- **GUEST-10**: Special occasion tracking (birthday, anniversary)

### Floor Plans

- **FLOOR-05**: Table combining for large parties
- **FLOOR-06**: Floor plan versioning
- **FLOOR-07**: Real-time table timer display

### Analytics

- **RPRT-01**: Daily revenue report
- **RPRT-02**: Server performance report
- **RPRT-03**: Table utilization report
- **RPRT-04**: Waitlist metrics report

### Integrations

- **INTG-01**: Opentable sync
- **INTG-02**: Google Calendar sync
- **INTG-03**: POS integration

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time WebSocket updates | v1 focuses on REST API |
| Kitchen Display System (KDS) | Back-of-house, Phase 2 |
| Mobile app | Web-first, later consideration |
| Payment processing | Guest Experience phase |
| Gift cards / loyalty | Guest Experience phase |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Foundation | Complete |
| AUTH-02 | Foundation | Complete |
| AUTH-03 | Foundation | Complete |
| TENANT-01 | Foundation | Complete |
| TENANT-02 | Foundation | Complete |
| TENANT-03 | Foundation | Complete |
| ROLE-01 | Foundation | Complete |
| ROLE-02 | Foundation | Complete |
| ROLE-03 | Foundation | Complete |
| FLOOR-01 | Phase 1 | Complete |
| FLOOR-02 | Phase 1 | Complete |
| FLOOR-03 | Phase 1 | Complete |
| FLOOR-04 | Phase 1 | Complete |
| SECT-01 | Phase 1 | Complete |
| SECT-02 | Phase 1 | Complete |
| SECT-03 | Phase 1 | Complete |
| TABLE-01 | Phase 1 | Complete |
| TABLE-02 | Phase 1 | Complete |
| TABLE-03 | Phase 1 | Complete |
| TABLE-04 | Phase 1 | Complete |
| TABLE-05 | Phase 1 | Complete |
| GUEST-01 | Phase 1 | Complete |
| GUEST-02 | Phase 1 | Complete |
| GUEST-03 | Phase 1 | Complete |
| GUEST-04 | Phase 1 | Complete |
| GUEST-05 | Phase 1 | Complete |
| GUEST-06 | Phase 1 | Complete |
| GUEST-07 | Phase 1 | Complete |
| SVC-01 | Phase 1 | Complete |
| SVC-02 | Phase 1 | Complete |
| SVC-03 | Phase 1 | Complete |
| SVC-04 | Phase 1 | Complete |
| SVC-05 | Phase 1 | Complete |
| RESV-01 | Phase 1 | Complete |
| RESV-02 | Phase 1 | Complete |
| RESV-03 | Phase 1 | Complete |
| RESV-04 | Phase 1 | Complete |
| RESV-05 | Phase 1 | Complete |
| RESV-06 | Phase 1 | Complete |
| RESV-07 | Phase 1 | Complete |
| RESV-08 | Phase 1 | Complete |
| WAIT-01 | Phase 1 | Complete |
| WAIT-02 | Phase 1 | Complete |
| WAIT-03 | Phase 1 | Complete |
| WAIT-04 | Phase 1 | Complete |
| WAIT-05 | Phase 1 | Complete |
| WAIT-06 | Phase 1 | Complete |
| WAIT-07 | Phase 1 | Complete |
| ASSIGN-01 | Phase 1 | Complete |
| ASSIGN-02 | Phase 1 | Complete |
| ASSIGN-03 | Phase 1 | Complete |
| ASSIGN-04 | Phase 1 | Complete |
| ASSIGN-05 | Phase 1 | Complete |
| DASH-01 | Phase 1 | Complete |
| DASH-02 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after project initialization*