import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_USER, AUTH_STATE_PATH } from "./helpers/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

function wranglerD1(sql: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "eat-sheet-db", "--local", "--command", sql],
    { cwd: PROJECT_ROOT, stdio: "pipe" },
  );
}

export default async function globalTeardown() {
  // Delete in FK-safe order
  try {
    wranglerD1(
      `DELETE FROM tenant_members WHERE user_id = '${TEST_USER.id}'`,
    );
  } catch {
    // No matching rows
  }

  try {
    // Delete venue themes for any tenants created by the test user
    wranglerD1(
      `DELETE FROM venue_themes WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'verde-kitchen%' OR slug LIKE 'skipped-logo%' OR slug LIKE 'back-test%')`,
    );
  } catch {
    // No matching rows
  }

  try {
    wranglerD1(
      `DELETE FROM tenants WHERE slug LIKE 'verde-kitchen%' OR slug LIKE 'skipped-logo%' OR slug LIKE 'back-test%'`,
    );
  } catch {
    // No matching rows
  }

  try {
    wranglerD1(`DELETE FROM users WHERE id = '${TEST_USER.id}'`);
  } catch {
    // No matching rows
  }

  // Remove auth state file
  try {
    unlinkSync(AUTH_STATE_PATH);
  } catch {
    // Already removed
  }
}
