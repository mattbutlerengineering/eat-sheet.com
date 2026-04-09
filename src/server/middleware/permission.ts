import { createMiddleware } from 'hono/factory';
import type { Env, AppVariables } from '../types';

type PermissionEnv = {
  Bindings: Env;
  Variables: AppVariables;
};

export function requirePermission(requiredPermission: string) {
  return createMiddleware<PermissionEnv>(async (c, next) => {
    const permissions = c.get('permissions') ?? [];

    if (permissions.includes('*') || permissions.includes(requiredPermission)) {
      await next();
      return;
    }

    return c.json({ error: 'Forbidden: insufficient permissions' }, 403);
  });
}
