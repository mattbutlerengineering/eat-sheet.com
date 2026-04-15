import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";
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

app.onError((err, c) => {
  if (err instanceof DomainError) {
    return c.json(error(err.message), err.statusCode as 400);
  }
  console.error("Unhandled error:", err);
  return c.json(error("Internal server error"), 500);
});

export default app;
export type AppType = typeof app;
