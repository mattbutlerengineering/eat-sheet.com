import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { authRoutes } from "./routes/auth";
import { restaurantRoutes } from "./routes/restaurants";
import { reviewRoutes } from "./routes/reviews";
import { photoRoutes } from "./routes/photos";
import { activityRoutes } from "./routes/activity";
import { statsRoutes } from "./routes/stats";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.route("/api/auth", authRoutes);
app.route("/api/restaurants", restaurantRoutes);
app.route("/api/reviews", reviewRoutes);
app.route("/api/photos", photoRoutes);
app.route("/api/activity", activityRoutes);
app.route("/api/stats", statsRoutes);

app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
