import { Hono } from "hono";
import { getMetrics } from "./service.js";
import type { MetricsResponse } from "./types.js";

const app = new Hono();

app.get("/", async (c) => {
  const accept = c.req.header("accept") ?? "";
  const metrics = getMetrics();

  // Prometheus text format for text/plain
  if (accept.includes("text/plain")) {
    const lines = [
      "# HELP app_version Application version",
      `app_version{version="${metrics.version}"} 1`,
      "# HELP app_acmm_level ACMM maturity level",
      `app_acmm_level ${metrics.acmm_level}`,
      "# HELP app_health Health check",
      `app_health{status="${metrics.healthcheck}"} 1`,
    ];
    return c.text(lines.join("\n"));
  }

  // Default: JSON
  return c.json(metrics satisfies MetricsResponse);
});

export default app;
