import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
  LOGOS: R2Bucket;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export type AppType = typeof app;

export default app;
