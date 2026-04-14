export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuthUser {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly tenantId: string | null;
  readonly roleId: string | null;
  readonly permissions: readonly string[];
}
