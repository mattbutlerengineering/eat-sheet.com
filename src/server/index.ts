import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as Sentry from '@sentry/cloudflare';
import type { Env, AppVariables } from './types';

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

// Routes will be mounted here as tasks complete

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
