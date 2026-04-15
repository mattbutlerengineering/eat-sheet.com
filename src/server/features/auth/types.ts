export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly name: string;
  readonly tenantId: string | null;
  readonly roleId: string | null;
  readonly permissions: readonly string[];
  readonly exp: number;
}
