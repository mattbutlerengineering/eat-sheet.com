import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import type { Env, JwtPayload } from "../types";

type AuthEnv = {
  Bindings: Env;
  Variables: {
    jwtPayload: JwtPayload;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization token" }, 401);
  }

  const token = authHeader.slice(7);
  const secret = c.env.JWT_SECRET || "dev-secret-change-in-production";

  try {
    const payload = (await verify(token, secret, "HS256")) as unknown as JwtPayload;
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
