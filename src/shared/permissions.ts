export const PERMISSIONS = {
  // Tenant
  TENANT_VIEW: 'tenant.view',
  TENANT_MANAGE: 'tenant.manage',

  // Floor & Tables
  FLOOR_VIEW: 'floor.view',
  FLOOR_MANAGE: 'floor.manage',
  TABLES_MANAGE: 'tables.manage',
  TABLES_UPDATE_STATUS: 'tables.update_status',

  // Guests
  GUESTS_VIEW: 'guests.view',
  GUESTS_CREATE: 'guests.create',
  GUESTS_UPDATE: 'guests.update',
  GUESTS_DELETE: 'guests.delete',

  // Shifts / Service Periods
  SHIFTS_VIEW: 'shifts.view',
  SHIFTS_MANAGE: 'shifts.manage',

  // Reservations
  RESERVATIONS_VIEW: 'reservations.view',
  RESERVATIONS_CREATE: 'reservations.create',
  RESERVATIONS_UPDATE: 'reservations.update',
  RESERVATIONS_DELETE: 'reservations.delete',

  // Waitlist
  WAITLIST_VIEW: 'waitlist.view',
  WAITLIST_CREATE: 'waitlist.create',
  WAITLIST_UPDATE: 'waitlist.update',
  WAITLIST_DELETE: 'waitlist.delete',
  WAITLIST_MANAGE: 'waitlist.manage',

  // Staff
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',

  // Reports
  REPORTS_VIEW: 'reports.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

// Default role → permission mappings (used in seed)
export const DEFAULT_ROLES = {
  owner: { name: 'Owner', description: 'Full access to everything', permissions: '*' as const },
  manager: {
    name: 'Manager',
    description: 'Manages floor, reservations, staff, and reports',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_MANAGE, PERMISSIONS.TABLES_MANAGE,
      PERMISSIONS.TABLES_UPDATE_STATUS, PERMISSIONS.GUESTS_VIEW, PERMISSIONS.GUESTS_CREATE,
      PERMISSIONS.GUESTS_UPDATE, PERMISSIONS.GUESTS_DELETE, PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.SHIFTS_MANAGE, PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.RESERVATIONS_CREATE,
      PERMISSIONS.RESERVATIONS_UPDATE, PERMISSIONS.RESERVATIONS_DELETE, PERMISSIONS.WAITLIST_VIEW,
      PERMISSIONS.WAITLIST_CREATE, PERMISSIONS.WAITLIST_UPDATE, PERMISSIONS.WAITLIST_DELETE,
      PERMISSIONS.WAITLIST_MANAGE, PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE,
      PERMISSIONS.REPORTS_VIEW, PERMISSIONS.FLOOR_VIEW,
    ],
  },
  host: {
    name: 'Host',
    description: 'Manages reservations, waitlist, and seating',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_VIEW, PERMISSIONS.TABLES_UPDATE_STATUS,
      PERMISSIONS.GUESTS_VIEW, PERMISSIONS.GUESTS_CREATE, PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.RESERVATIONS_CREATE, PERMISSIONS.RESERVATIONS_UPDATE,
      PERMISSIONS.WAITLIST_VIEW, PERMISSIONS.WAITLIST_CREATE, PERMISSIONS.WAITLIST_UPDATE,
      PERMISSIONS.WAITLIST_MANAGE, PERMISSIONS.STAFF_VIEW,
    ],
  },
  server: {
    name: 'Server',
    description: 'Views assigned section and guest info',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_VIEW, PERMISSIONS.GUESTS_VIEW,
      PERMISSIONS.SHIFTS_VIEW, PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.WAITLIST_VIEW,
      PERMISSIONS.STAFF_VIEW,
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to all data',
    permissions: [
      PERMISSIONS.TENANT_VIEW, PERMISSIONS.FLOOR_VIEW, PERMISSIONS.GUESTS_VIEW,
      PERMISSIONS.SHIFTS_VIEW, PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.WAITLIST_VIEW,
      PERMISSIONS.STAFF_VIEW, PERMISSIONS.REPORTS_VIEW,
    ],
  },
} as const;
