const DEFAULT_TURN_TIME = 90;

const VALID_TRANSITIONS: Record<string, string[]> = {
  waiting: ['notified', 'left', 'cancelled'],
  notified: ['seated', 'left', 'cancelled'],
};

export function canTransitionWaitlist(currentStatus: string, newStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

export async function estimateWait(
  db: D1Database,
  tenantId: string,
  partySize: number
): Promise<number> {
  // 1. Count waiting entries ahead (status='waiting') with party_size <= partySize
  const aheadResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM waitlist
       WHERE tenant_id = ? AND status = 'waiting' AND party_size <= ?`
    )
    .bind(tenantId, partySize)
    .first<{ count: number }>();

  const partiesAhead = aheadResult?.count ?? 0;

  // 2. Get current service period's turn_time (or default 90)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const periodResult = await db
    .prepare(
      `SELECT turn_time FROM service_periods
       WHERE tenant_id = ? AND day_of_week = ? AND is_active = 1
         AND start_time <= ? AND end_time >= ?
       ORDER BY start_time DESC LIMIT 1`
    )
    .bind(tenantId, dayOfWeek, currentTime, currentTime)
    .first<{ turn_time: number }>();

  const turnTime = periodResult?.turn_time ?? DEFAULT_TURN_TIME;

  // 3. Count compatible tables (active floor plan, max_capacity >= partySize, status != 'blocked')
  const tablesResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM tables t
       JOIN floor_plans fp ON fp.id = t.floor_plan_id
       WHERE t.tenant_id = ?
         AND fp.is_active = 1
         AND t.max_capacity >= ?
         AND t.status != 'blocked'`
    )
    .bind(tenantId, partySize)
    .first<{ count: number }>();

  const compatibleTables = tablesResult?.count ?? 0;

  // 4. Calculate estimated wait
  if (compatibleTables === 0) {
    return partiesAhead * turnTime;
  }

  return Math.ceil(partiesAhead / compatibleTables) * turnTime;
}

export async function rebalancePositions(
  db: D1Database,
  tenantId: string
): Promise<void> {
  const { results } = await db
    .prepare(
      `SELECT id FROM waitlist
       WHERE tenant_id = ? AND status = 'waiting'
       ORDER BY position ASC`
    )
    .bind(tenantId)
    .all<{ id: string }>();

  for (let i = 0; i < results.length; i++) {
    const entry = results[i];
    if (!entry) continue;
    await db
      .prepare(`UPDATE waitlist SET position = ? WHERE id = ? AND tenant_id = ?`)
      .bind(i + 1, entry.id, tenantId)
      .run();
  }
}
