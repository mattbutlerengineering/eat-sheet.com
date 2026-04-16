import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sign } from "hono/jwt";
import { TEST_USER, JWT_SECRET, AUTH_STATE_PATH } from "./helpers/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

function wranglerD1(sql: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "eat-sheet-db", "--local", "--command", sql],
    { cwd: PROJECT_ROOT, stdio: "pipe" },
  );
}

function wranglerD1File(filePath: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "eat-sheet-db", "--local", "--file", filePath],
    { cwd: PROJECT_ROOT, stdio: "pipe" },
  );
}

export default async function globalSetup() {
  // 1. Apply schema (idempotent — errors if tables exist, that's fine)
  try {
    wranglerD1File("src/server/db/migrations/001_onboarding.sql");
  } catch {
    // Tables already exist — expected on subsequent runs
  }

  // 2. Seed system roles (INSERT OR IGNORE = idempotent)
  wranglerD1File("src/server/db/seed.sql");

  // 3. Clean up any leftover test data from a previous failed run
  try {
    wranglerD1(
      `DELETE FROM tenant_members WHERE user_id = '${TEST_USER.id}'`,
    );
  } catch {
    // Table may not have matching rows
  }
  try {
    wranglerD1(
      `DELETE FROM venue_themes WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = '${TEST_USER.id}')`,
    );
  } catch {
    // No matching data
  }

  // 4. Insert test user (idempotent)
  wranglerD1(
    `INSERT OR REPLACE INTO users (id, email, name, created_at, updated_at) VALUES ('${TEST_USER.id}', '${TEST_USER.email}', '${TEST_USER.name}', datetime('now'), datetime('now'))`,
  );

  // 5. Sign JWT — user has no tenant yet (pre-onboarding state)
  const token = await sign(
    {
      sub: TEST_USER.id,
      email: TEST_USER.email,
      name: TEST_USER.name,
      tenantId: null,
      roleId: null,
      permissions: [],
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET,
    "HS256",
  );

  // 6. Write Playwright storageState with the JWT cookie
  const storageState = {
    cookies: [
      {
        name: "token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 3600,
      },
    ],
    origins: [],
  };

  writeFileSync(AUTH_STATE_PATH, JSON.stringify(storageState, null, 2));
}
