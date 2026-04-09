export interface TimeSlot {
  readonly time: string;
  readonly available_tables: number;
}

interface ServicePeriod {
  start_time: string;
  end_time: string;
  reservation_interval: number;
  turn_time: number;
}

interface Reservation {
  time: string;
  table_id: string | null;
}

function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDayOfWeek(dateString: string): number {
  // Parse date as local date to avoid UTC offset shifting the day
  const parts = dateString.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day).getDay();
}

export async function getAvailableSlots(
  db: D1Database,
  tenantId: string,
  date: string,
  partySize: number
): Promise<TimeSlot[]> {
  const dayOfWeek = getDayOfWeek(date);

  // 1. Query active service periods for that day
  const { results: periods } = await db
    .prepare(
      `SELECT start_time, end_time, reservation_interval, turn_time
       FROM service_periods
       WHERE tenant_id = ? AND day_of_week = ? AND is_active = 1
       ORDER BY start_time`
    )
    .bind(tenantId, dayOfWeek)
    .all<ServicePeriod>();

  if (periods.length === 0) {
    return [];
  }

  // 2. Query eligible tables from active floor plans
  const { results: tables } = await db
    .prepare(
      `SELECT t.id
       FROM tables t
       JOIN floor_plans fp ON fp.id = t.floor_plan_id
       WHERE t.tenant_id = ?
         AND fp.is_active = 1
         AND t.max_capacity >= ?
         AND t.min_capacity <= ?
         AND t.status != 'blocked'`
    )
    .bind(tenantId, partySize, partySize)
    .all<{ id: string }>();

  const totalTables = tables.length;

  if (totalTables === 0) {
    return [];
  }

  const tableIds = new Set(tables.map((t) => t.id));

  // 3. Query existing reservations for that date with active statuses
  const { results: reservations } = await db
    .prepare(
      `SELECT time, table_id
       FROM reservations
       WHERE tenant_id = ? AND date = ? AND status IN ('confirmed', 'seated')`
    )
    .bind(tenantId, date)
    .all<Reservation>();

  const slots: TimeSlot[] = [];

  // 4. For each service period, generate time slots and count available tables
  for (const period of periods) {
    const startMinutes = timeToMinutes(period.start_time);
    const endMinutes = timeToMinutes(period.end_time);
    const interval = period.reservation_interval;
    const turnTime = period.turn_time;

    // Generate slots from start_time up to (end_time - turn_time)
    const lastSlotMinutes = endMinutes - turnTime;

    for (let slotMinutes = startMinutes; slotMinutes <= lastSlotMinutes; slotMinutes += interval) {
      const slotTime = minutesToTime(slotMinutes);

      // Count tables booked within the turn_time window of this slot
      const bookedTableIds = new Set<string>();
      for (const res of reservations) {
        if (res.table_id === null || !tableIds.has(res.table_id)) {
          continue;
        }
        const resMinutes = timeToMinutes(res.time);
        // A table is booked if the reservation overlaps with [slotMinutes, slotMinutes + turnTime)
        if (resMinutes < slotMinutes + turnTime && resMinutes + turnTime > slotMinutes) {
          bookedTableIds.add(res.table_id);
        }
      }

      const availableTables = totalTables - bookedTableIds.size;

      slots.push({ time: slotTime, available_tables: availableTables });
    }
  }

  return slots;
}
