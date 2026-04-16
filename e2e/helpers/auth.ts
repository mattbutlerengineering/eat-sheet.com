import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const AUTH_STATE_PATH = path.join(__dirname, "..", ".auth-state.json");

export const TEST_USER = {
  id: "e2e-test-user-001",
  email: "e2e-test@eat-sheet.com",
  name: "E2E Test User",
} as const;

export const JWT_SECRET = "dev-secret-change-in-production";
