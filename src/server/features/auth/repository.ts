import { nanoid } from "nanoid";

export interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatar_url: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TenantMemberRow {
  readonly tenant_id: string;
  readonly role_id: string;
  readonly permissions: string;
}

export async function findUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<UserRow>();
  return result ?? null;
}

export async function createUser(
  db: D1Database,
  user: { email: string; name: string; avatarUrl: string | null },
): Promise<UserRow> {
  const id = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      "INSERT INTO users (id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id, user.email, user.name, user.avatarUrl, now, now)
    .run();

  const created = await findUserByEmail(db, user.email);
  if (!created) {
    throw new Error("Failed to create user");
  }
  return created;
}

export async function findUserTenants(
  db: D1Database,
  userId: string,
): Promise<TenantMemberRow[]> {
  const result = await db
    .prepare(
      `SELECT tm.tenant_id, tm.role_id, r.permissions
       FROM tenant_members tm
       JOIN roles r ON r.id = tm.role_id
       WHERE tm.user_id = ?`,
    )
    .bind(userId)
    .all<TenantMemberRow>();
  return result.results;
}
