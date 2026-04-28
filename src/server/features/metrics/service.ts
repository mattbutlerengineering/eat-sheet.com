import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MetricsResponse } from "./types.js";

// Read version from package.json at startup
let version = "unknown";
try {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));
  version = pkg.version ?? "unknown";
} catch { /* ignore */ }

// Read ACMM state at startup
let acmmLevel = 2;
let acmmRole = "Rule-writer";
try {
  const state = JSON.parse(
    readFileSync(".claude/acmm/state.json", "utf-8"),
  );
  acmmLevel = state.level ?? 2;
  acmmRole = state.role ?? "Rule-writer";
} catch { /* ignore — defaults to L2 */ }

// Read commit SHA from injected env or fallback
const commit = (process.env.COMMIT_SHA ?? "unknown").slice(0, 7);

// Count applied D1 migrations
let dbSchemaVersion = 0;
try {
  // Migration files are numbered sequentially
  const { readdirSync } = await import("node:fs");
  const migrations = readdirSync("src/server/db/migrations")
    .filter((f) => /^\d+/.test(f));
  dbSchemaVersion = migrations.length;
} catch { /* ignore */ }

export function getMetrics(): MetricsResponse {
  return {
    version,
    commit,
    acmm_level: acmmLevel,
    acmm_role: acmmRole,
    db_schema_version: dbSchemaVersion,
    uptime_seconds: "edge", // Cloudflare Workers are ephemeral
    healthcheck: "ok",
  };
}
