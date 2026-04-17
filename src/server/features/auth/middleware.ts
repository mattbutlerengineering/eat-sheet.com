import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../../types";
import type { JwtPayload } from "./types";
import { ForbiddenError } from "../../errors";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const cookieToken = getCookie(c, "token");

  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return c.json({ ok: false as const, error: "Unauthorized" }, 401);
  }

  let payload: JwtPayload;
  try {
    payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as unknown as JwtPayload;
  } catch {
    return c.json({ ok: false as const, error: "Unauthorized" }, 401);
  }

  c.set("user", {
    userId: payload.sub,
    email: payload.email,
    name: payload.name,
    tenantId: payload.tenantId,
    roleId: payload.roleId,
    permissions: payload.permissions,
  });

  return next();
});

export function requirePermission(permission: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const perms = c.var.user.permissions;
    if (!perms.includes("*") && !perms.includes(permission)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    return next();
  });
}

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const cookieToken = getCookie(c, "token");

  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (token) {
    try {
      const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as unknown as JwtPayload;
      c.set("user", {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        tenantId: payload.tenantId,
        roleId: payload.roleId,
        permissions: payload.permissions,
      });
    } catch {
      // Token invalid — proceed without setting user
    }
  }

  return next();
});
