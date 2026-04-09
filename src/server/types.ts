export interface Env {
  readonly DB: D1Database;
  readonly JWT_SECRET: string;
  readonly PHOTOS: R2Bucket;
  readonly GOOGLE_OAUTH_CLIENT_ID: string;
  readonly GOOGLE_OAUTH_CLIENT_SECRET: string;
  readonly OAUTH_REDIRECT_BASE: string;
  readonly SENTRY_DSN: string;
}

export interface JwtPayload {
  readonly userId: string;
  readonly tenantId: string;
  readonly roleId: string;
  readonly permissions: string[];
  readonly exp: number;
}

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly settings: string | null;
  readonly created_at: string;
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly oauth_provider: string | null;
  readonly oauth_id: string | null;
  readonly created_at: string;
}

export interface TenantMember {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly role_id: string;
  readonly is_owner: number;
  readonly created_at: string;
}

export interface Role {
  readonly id: string;
  readonly tenant_id: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly is_system: number;
  readonly created_at: string;
}

export interface Permission {
  readonly id: string;
  readonly key: string;
  readonly category: string;
  readonly description: string | null;
}

export interface FloorPlan {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly is_active: number;
  readonly created_at: string;
}

export interface Section {
  readonly id: string;
  readonly floor_plan_id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly sort_order: number;
  readonly created_at: string;
}

export interface Table {
  readonly id: string;
  readonly floor_plan_id: string;
  readonly section_id: string | null;
  readonly tenant_id: string;
  readonly label: string;
  readonly min_capacity: number;
  readonly max_capacity: number;
  readonly is_combinable: number;
  readonly status: 'available' | 'occupied' | 'reserved' | 'blocked';
  readonly position_x: number | null;
  readonly position_y: number | null;
  readonly created_at: string;
}

export interface Guest {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly tags: string | null;
  readonly notes: string | null;
  readonly visit_count: number;
  readonly last_visit_at: string | null;
  readonly created_at: string;
}

export interface ServicePeriod {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly day_of_week: number;
  readonly start_time: string;
  readonly end_time: string;
  readonly max_reservations: number | null;
  readonly reservation_interval: number;
  readonly turn_time: number;
  readonly is_active: number;
  readonly created_at: string;
}

export interface Reservation {
  readonly id: string;
  readonly tenant_id: string;
  readonly guest_id: string;
  readonly table_id: string | null;
  readonly service_period_id: string | null;
  readonly party_size: number;
  readonly date: string;
  readonly time: string;
  readonly status: 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled';
  readonly notes: string | null;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string | null;
}

export interface WaitlistEntry {
  readonly id: string;
  readonly tenant_id: string;
  readonly guest_id: string | null;
  readonly guest_name: string;
  readonly party_size: number;
  readonly phone: string | null;
  readonly quoted_wait: number | null;
  readonly position: number;
  readonly status: 'waiting' | 'notified' | 'seated' | 'left' | 'cancelled';
  readonly notes: string | null;
  readonly checked_in_at: string;
  readonly seated_at: string | null;
  readonly created_at: string;
}

export interface ServerAssignment {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly section_id: string | null;
  readonly table_id: string | null;
  readonly service_period_id: string;
  readonly date: string;
  readonly created_at: string;
}

// API response envelope
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly meta?: { readonly total: number; readonly page: number; readonly limit: number };
}

// Hono app type with our bindings and variables
export interface AppVariables {
  userId: string;
  tenantId: string;
  roleId: string;
  permissions: string[];
  sentryReported: boolean;
}
