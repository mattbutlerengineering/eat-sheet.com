import { Hono } from "hono";
import { cors } from "hono/cors";
import * as Sentry from "@sentry/cloudflare";
import type { Env } from "./types";
import { authRoutes } from "./routes/auth";
import { restaurantRoutes } from "./routes/restaurants";
import { reviewRoutes } from "./routes/reviews";
import { photoRoutes } from "./routes/photos";
import { activityRoutes } from "./routes/activity";
import { statsRoutes } from "./routes/stats";
import { reactionRoutes } from "./routes/reactions";
import { bookmarkRoutes } from "./routes/bookmarks";
import { shareRoutes } from "./routes/share";
import { placesRoutes } from "./routes/places";
import { recommendationRoutes } from "./routes/recommendations";
import { groupRoutes } from "./routes/groups";
import { enrichRoutes } from "./routes/enrich";
import { tonightRoutes } from "./routes/tonight";

const app = new Hono<{ Bindings: Env; Variables: { sentryReported: boolean } }>();

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      const allowed = ["https://eat-sheet.com", "https://www.eat-sheet.com"];
      if (!origin || allowed.includes(origin) || origin.startsWith("http://localhost:")) {
        return origin ?? "";
      }
      return "";
    },
  })
);

// Capture 5xx responses that don't throw (e.g. explicit c.json({error}, 502))
// Skips if onError already reported (thrown errors set sentryReported flag)
app.use("/api/*", async (c, next) => {
  await next();
  if (c.res.status >= 500 && !c.get("sentryReported")) {
    Sentry.captureMessage(`${c.req.method} ${c.req.path} → ${c.res.status}`, {
      level: "error",
      extra: { status: c.res.status },
    });
  }
});

app.route("/api/auth", authRoutes);
app.route("/api/restaurants", restaurantRoutes);
app.route("/api/reviews", reviewRoutes);
app.route("/api/photos", photoRoutes);
app.route("/api/activity", activityRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/reactions", reactionRoutes);
app.route("/api/bookmarks", bookmarkRoutes);
app.route("/api/share", shareRoutes);
app.route("/api/places", placesRoutes);
app.route("/api/recommendations", recommendationRoutes);
app.route("/api/groups", groupRoutes);
app.route("/api/admin", enrichRoutes);
app.route("/api/tonight", tonightRoutes);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.path}:`, err.stack ?? err.message);
  Sentry.captureException(err);
  c.set("sentryReported", true);
  return c.json({ error: "Internal server error" }, 500);
});

export default Sentry.withSentry(
  (env: Env) => ({ dsn: env.SENTRY_DSN }),
  app
);
