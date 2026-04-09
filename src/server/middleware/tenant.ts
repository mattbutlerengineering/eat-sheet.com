import { createMiddleware } from 'hono/factory';
import type { Env, AppVariables } from '../types';

type TenantEnv = {
  Bindings: Env;
  Variables: AppVariables;
};

export const tenantScope = createMiddleware<TenantEnv>(async (c, next) => {
  const urlTenantId = c.req.param('tenantId');
  const jwtTenantId = c.get('tenantId');

  if (urlTenantId !== jwtTenantId) {
    return c.json({ error: 'Forbidden: tenant mismatch' }, 403);
  }

  await next();
});
