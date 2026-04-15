import { Hono } from "hono";
import { cors } from "hono/cors";
import * as Sentry from "@sentry/cloudflare";
import type { AppEnv } from "./types";
import type { Bindings } from "./types";
import { DomainError } from "./errors";
import { error } from "./response";
import { auth } from "./features/auth/routes";
import { venues } from "./features/venues/routes";
import { onboarding } from "./features/onboarding/routes";

const app = new Hono<AppEnv>();

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
app.route("/api/onboarding", onboarding);

// SPA fallback: serve index.html for non-API, non-asset routes
app.get("*", async (c) => {
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
