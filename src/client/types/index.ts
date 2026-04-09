export interface AuthState {
  readonly token: string | null;
  readonly userId: string | null;
  readonly tenantId: string | null;
  readonly permissions: string[];
}

export interface TenantMembership {
  readonly tenant_id: string;
  readonly tenant_name: string;
  readonly tenant_slug: string;
  readonly role_id: string;
  readonly role_name: string;
  readonly is_owner: number;
}

export interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}
