import { Hono } from "hono";
import { cors } from "hono/cors";
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

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.route("/api/auth", authRoutes);
app.route("/api/restaurants", restaurantRoutes);
app.route("/api/reviews", reviewRoutes);
app.route("/api/photos", photoRoutes);
app.route("/api/activity", activityRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/reactions", reactionRoutes);
app.route("/api/bookmarks", bookmarkRoutes);
app.route("/api/share", shareRoutes);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.path}:`, err.message);
  return c.json({ error: err.message }, 500);
});

export default app;
