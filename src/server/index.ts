import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as Sentry from '@sentry/cloudflare';
import type { Env, AppVariables } from './types';
import { authMiddleware } from './middleware/auth';
import { tenantScope } from './middleware/tenant';
import { authRoutes } from './routes/auth';
import { tenantsRouter } from './routes/tenants';
import { memberRoutes } from './routes/members';
import { roleRoutes } from './routes/roles';
import { floorPlanRoutes, tableRoutes } from './routes/floor-plans';
import { guestRoutes } from './routes/guests';
import { servicePeriodRoutes } from './routes/service-periods';
import { reservationRoutes } from './routes/reservations';
import { waitlistRoutes } from './routes/waitlist';
import { assignmentRoutes } from './routes/assignments';
import { dashboardRoutes } from './routes/dashboard';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const app = new Hono<AppEnv>();

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin || origin.startsWith('http://localhost:')) {
        return origin ?? '';
      }
      return '';
    },
  })
);

// Capture 5xx responses for Sentry
app.use('/api/*', async (c, next) => {
  await next();
  if (c.res.status >= 500 && !c.get('sentryReported')) {
    Sentry.captureMessage(`${c.req.method} ${c.req.path} → ${c.res.status}`, {
      level: 'error',
      extra: { status: c.res.status },
    });
  }
});

// Public + auth routes
app.route('/api/auth', authRoutes);

// Authenticated (no tenant scope) — creating tenants
app.use('/api/tenants/*', authMiddleware);
app.route('/api/tenants', tenantsRouter);

// Tenant-scoped routes
app.use('/api/t/:tenantId/*', authMiddleware, tenantScope);
app.route('/api/t/:tenantId', tenantsRouter);
app.route('/api/t/:tenantId/members', memberRoutes);
app.route('/api/t/:tenantId/roles', roleRoutes);
app.route('/api/t/:tenantId/floor-plans', floorPlanRoutes);
app.route('/api/t/:tenantId/tables', tableRoutes);
app.route('/api/t/:tenantId/guests', guestRoutes);
app.route('/api/t/:tenantId/service-periods', servicePeriodRoutes);
app.route('/api/t/:tenantId/reservations', reservationRoutes);
app.route('/api/t/:tenantId/waitlist', waitlistRoutes);
app.route('/api/t/:tenantId/assignments', assignmentRoutes);
app.route('/api/t/:tenantId/dashboard', dashboardRoutes);

app.get('/api/health', (c) => c.json({ success: true, data: { status: 'ok' } }));

app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.path}:`, err.stack ?? err.message);
  Sentry.captureException(err);
  c.set('sentryReported', true);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default Sentry.withSentry(
  (env: Env) => ({ dsn: env.SENTRY_DSN }),
  app
);

export { app };
export type { AppEnv };
