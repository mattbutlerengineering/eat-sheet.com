# Roadmap: eat-sheet.com

**Created:** 2026-04-11
**Core Value:** Enable restaurant staff to manage front-of-house operations through a role-based interface with real-time floor plan visualization.

## Overview

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| Foundation | Multi-Tenant Auth & Roles | Complete | 9 | ✓ Complete |
| Phase 1 | FOH Core Operations | Complete | 42 | ✓ Complete |
| Phase 2 | Guest Experience | Enhance | 10 | ✓ Complete |
| Phase 3 | Analytics & Reporting | Build | 4 | Pending |
| Phase 4 | Integrations | Connect | 3 | Pending |

## Phase Details

### Foundation: Multi-Tenant Auth & Roles

**Goal:** Core infrastructure for authentication, multi-tenancy, and role-based access

**Requirements:**
- AUTH-01, AUTH-02, AUTH-03 (Authentication)
- TENANT-01, TENANT-02, TENANT-03 (Multi-Tenancy)
- ROLE-01, ROLE-02, ROLE-03 (Roles & Permissions)

**Success Criteria:**
1. User can sign up/login via Google OAuth
2. JWT session persists across requests
3. User can switch between tenant memberships
4. Tenant creation with proper isolation
5. Roles and permissions protect API endpoints

**Status:** ✓ Complete

---

### Phase 1: FOH Core Operations

**Goal:** Complete front-of-house operations (floor plans, reservations, waitlist, guests)

**Requirements:**
- FLOOR-01 through FLOOR-04 (Floor Plans)
- SECT-01 through SECT-03 (Sections)
- TABLE-01 through TABLE-05 (Tables)
- GUEST-01 through GUEST-07 (Guests)
- SVC-01 through SVC-05 (Service Periods)
- RESV-01 through RESV-08 (Reservations)
- WAIT-01 through WAIT-07 (Waitlist)
- ASSIGN-01 through ASSIGN-05 (Server Assignments)
- DASH-01, DASH-02 (Dashboard)

**Success Criteria:**
1. Create and manage floor plans with sections and tables
2. Table status reflects reservation lifecycle
3. Guest profiles track visit history
4. Service periods define operating hours
5. Reservations manage booking lifecycle
6. Waitlist handles walk-ins with position management
7. Server assignments to sections
8. Dashboard displays real-time stats by role

**Status:** ✓ Complete

---

### Phase 2: Guest Experience

**Goal:** Enhanced guest communication and preferences

**Requirements:**
- NOTF-01, NOTF-02 (Notifications) — deferred
- GUEST-08, GUEST-09, GUEST-10 (Guest Experience)
- FLOOR-05, FLOOR-06, FLOOR-07 (Floor Plan Enhancements) — FLOOR-06 deferred

**Success Criteria:**
1. SMS notification when table ready
2. Email confirmation for reservations
3. Track guest allergies and preferences
4. VIP tagging and special occasion tracking
5. Table combining for large parties
6. Floor plan versioning
7. Real-time table timer display

**Status:** ✓ Complete

**Plans:**
- [x] 02-01-PLAN.md — Guest enhancements (VIP tiers, special occasions, allergy tags)
- [x] 02-02-PLAN.md — Table combining and real-time timer

---

### Phase 3: Analytics & Reporting

**Goal:** Business intelligence and performance metrics

**Requirements:**
- RPRT-01 through RPRT-04 (Reports)

**Success Criteria:**
1. Daily revenue report
2. Server performance report
3. Table utilization report
4. Waitlist metrics report

**Status:** Pending

---

### Phase 4: Integrations

**Goal:** Connect with external systems

**Requirements:**
- INTG-01, INTG-02, INTG-03 (Integrations)

**Success Criteria:**
1. Opentable two-way sync
2. Google Calendar sync
3. POS integration

**Status:** Pending

---

## Coverage Summary

| Category | Total | Complete | Pending |
|----------|-------|----------|---------|
| Foundation | 9 | 9 | 0 |
| FOH Core | 42 | 42 | 0 |
| Guest Experience | 10 | 3 | 7 |
| Analytics | 4 | 0 | 4 |
| Integrations | 3 | 0 | 3 |
| **Total** | **68** | **54** | **14** |

**Note:** 51 v1 requirements already implemented. Phase 2-4 scope is v2+ features.

---
*Roadmap created: 2026-04-11*