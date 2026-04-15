import { sign } from "hono/jwt";
import {
  findUserByEmail,
  createUser,
  findUserTenants,
  type UserRow,
} from "./repository";
import type { JwtPayload } from "./types";

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface GoogleProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly picture: string | null;
}

export async function findOrCreateUser(
  db: D1Database,
  googleProfile: GoogleProfile,
): Promise<UserRow> {
  const existing = await findUserByEmail(db, googleProfile.email);
  if (existing) {
    return existing;
  }
  return createUser(db, {
    email: googleProfile.email,
    name: googleProfile.name,
    avatarUrl: googleProfile.picture,
  });
}

export async function buildJwtPayload(
  db: D1Database,
  user: UserRow,
): Promise<JwtPayload> {
  const tenants = await findUserTenants(db, user.id);
  const firstTenant = tenants[0] ?? null;

  const permissions: readonly string[] = firstTenant
    ? (JSON.parse(firstTenant.permissions) as string[])
    : [];

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    tenantId: firstTenant?.tenant_id ?? null,
    roleId: firstTenant?.role_id ?? null,
    permissions,
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
  };
}

export async function signJwt(
  payload: JwtPayload,
  secret: string,
): Promise<string> {
  return sign(payload as unknown as Record<string, unknown>, secret);
}
