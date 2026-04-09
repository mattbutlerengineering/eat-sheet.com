import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { Env, AppVariables, JwtPayload } from '../types';

type AuthEnv = {
  Bindings: Env;
  Variables: AppVariables;
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization token' }, 401);
  }

  const token = authHeader.slice(7);
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  try {
    const payload = (await verify(token, secret, 'HS256')) as unknown as JwtPayload;
    c.set('userId', payload.userId);
    c.set('tenantId', payload.tenantId);
    c.set('roleId', payload.roleId);
    c.set('permissions', payload.permissions);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});
