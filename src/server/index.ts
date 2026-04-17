import { Hono } from "hono";
import { cors } from "hono/cors";
import * as Sentry from "@sentry/cloudflare";
import type { AppEnv } from "./types";
import type { Bindings } from "./types";
import { DomainError } from "./errors";
import { error } from "./response";
import { auth } from "./features/auth/routes";
import { venues } from "./features/venues/routes";
import { floorPlans } from "./features/floor-plans/routes";
import { onboarding } from "./features/onboarding/routes";

const app = new Hono<AppEnv>();

// Redirect www to non-www to prevent cookie/OAuth domain mismatches
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.hostname === "www.eat-sheet.com") {
    url.hostname = "eat-sheet.com";
    return c.redirect(url.toString(), 301);
  }
  return next();
});

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "https://eat-sheet.com"],
    credentials: true,
  }),
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", auth);
app.route("/api/t", venues);
app.route("/api/t", floorPlans);
app.route("/api/onboarding", onboarding);

// Serve static assets and SPA fallback
app.get("*", async (c) => {
  // Try serving the request as a static asset first
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }
  // SPA fallback: serve index.html for non-asset routes
  const index = new Request(new URL("/index.html", c.req.url));
  return c.env.ASSETS.fetch(index);
});

app.onError((err, c) => {
  if (err instanceof DomainError) {
    return c.json(error(err.message), err.statusCode as 400);
  }
  Sentry.captureException(err);
  console.error("Unhandled error:", err);
  return c.json(error("Internal server error"), 500);
});

export default Sentry.withSentry(
  (env: Bindings) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  app,
);
export type AppType = typeof app;
