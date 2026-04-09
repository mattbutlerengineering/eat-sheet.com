import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';

type HonoEnv = { Bindings: Env; Variables: AppVariables };

interface DashboardData {
  readonly reservationsToday: number;
  readonly waitlistLength: number;
  readonly tables: Record<string, number>;
}

function buildDashboardSpec(roleId: string, data: DashboardData) {
  const elements: Record<string, object> = {};
  const rootChildren: string[] = [];

  // Header
  elements['header'] = { type: 'PageHeader', props: { title: 'Dashboard', subtitle: "Today's overview" } };
  rootChildren.push('header');

  // Stats grid
  elements['stats-grid'] = { type: 'CardGrid', props: { columns: 3 }, children: ['stat-reservations', 'stat-waitlist', 'stat-tables'] };
  elements['stat-reservations'] = { type: 'StatCard', props: { label: 'Reservations Today', value: data.reservationsToday, icon: 'calendar' } };
  elements['stat-waitlist'] = { type: 'StatCard', props: { label: 'On Waitlist', value: data.waitlistLength, icon: 'clock' } };
  elements['stat-tables'] = {
    type: 'StatCard',
    props: { label: 'Tables Available', value: data.tables['available'] ?? 0, total: Object.values(data.tables).reduce((a, b) => a + b, 0), icon: 'layout' },
  };
  rootChildren.push('stats-grid');

  return { root: 'root', elements: { root: { type: 'Page', children: rootChildren }, ...elements } };
}

export const dashboardRoutes = new Hono<HonoEnv>();

// GET / — Return json-render spec with live dashboard stats
dashboardRoutes.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const roleId = c.get('roleId') ?? '';
  const db = c.env.DB;

  const today = new Date().toISOString().slice(0, 10);

  const [reservationsResult, waitlistResult, tablesResult] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM reservations
         WHERE tenant_id = ? AND date = ? AND status IN ('confirmed', 'seated')`
      )
      .bind(tenantId, today)
      .first<{ count: number }>(),

    db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM waitlist_entries
         WHERE tenant_id = ? AND status = 'waiting'`
      )
      .bind(tenantId)
      .first<{ count: number }>(),

    db
      .prepare(
        `SELECT t.status, COUNT(*) AS count
         FROM tables t
         INNER JOIN floor_plans fp ON fp.id = t.floor_plan_id
         WHERE t.tenant_id = ? AND fp.is_active = 1
         GROUP BY t.status`
      )
      .bind(tenantId)
      .all<{ status: string; count: number }>(),
  ]);

  const reservationsToday = reservationsResult?.count ?? 0;
  const waitlistLength = waitlistResult?.count ?? 0;

  const tables: Record<string, number> = {};
  for (const row of tablesResult.results) {
    tables[row.status] = row.count;
  }

  const data: DashboardData = { reservationsToday, waitlistLength, tables };
  const spec = buildDashboardSpec(roleId, data);

  return c.json({ success: true, data: spec }, 200);
});
