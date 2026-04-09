import { canTransitionTable, updateTableStatus } from './table-service';

const VALID_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed', 'no_show'],
};

export function canTransitionReservation(currentStatus: string, newStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

interface ReservationRow {
  id: string;
  status: string;
  table_id: string | null;
  guest_id: string;
}

export async function transitionReservation(
  db: D1Database,
  tenantId: string,
  reservationId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch reservation
  const reservation = await db
    .prepare('SELECT id, status, table_id, guest_id FROM reservations WHERE id = ? AND tenant_id = ?')
    .bind(reservationId, tenantId)
    .first<ReservationRow>();

  if (reservation === null) {
    return { success: false, error: 'Reservation not found' };
  }

  // 2. Validate transition
  if (!canTransitionReservation(reservation.status, newStatus)) {
    return {
      success: false,
      error: `Cannot transition reservation from '${reservation.status}' to '${newStatus}'`,
    };
  }

  const now = new Date().toISOString();

  // 3. Update reservation status + updated_at
  await db
    .prepare('UPDATE reservations SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?')
    .bind(newStatus, now, reservationId, tenantId)
    .run();

  // 4. Side effects based on new status
  if (newStatus === 'seated') {
    // Table → occupied
    if (reservation.table_id !== null) {
      const table = await db
        .prepare('SELECT status FROM tables WHERE id = ? AND tenant_id = ?')
        .bind(reservation.table_id, tenantId)
        .first<{ status: string }>();

      if (table !== null && canTransitionTable(table.status, 'occupied')) {
        await updateTableStatus(db, reservation.table_id, tenantId, 'occupied');
      }
    }

    // Guest visit_count += 1
    await db
      .prepare('UPDATE guests SET visit_count = visit_count + 1 WHERE id = ? AND tenant_id = ?')
      .bind(reservation.guest_id, tenantId)
      .run();
  } else if (newStatus === 'completed') {
    // Table → available
    if (reservation.table_id !== null) {
      const table = await db
        .prepare('SELECT status FROM tables WHERE id = ? AND tenant_id = ?')
        .bind(reservation.table_id, tenantId)
        .first<{ status: string }>();

      if (table !== null && canTransitionTable(table.status, 'available')) {
        await updateTableStatus(db, reservation.table_id, tenantId, 'available');
      }
    }

    // Guest last_visit_at = now
    await db
      .prepare('UPDATE guests SET last_visit_at = ? WHERE id = ? AND tenant_id = ?')
      .bind(now, reservation.guest_id, tenantId)
      .run();
  } else if (newStatus === 'no_show' || newStatus === 'cancelled') {
    // Table → available (if assigned)
    if (reservation.table_id !== null) {
      const table = await db
        .prepare('SELECT status FROM tables WHERE id = ? AND tenant_id = ?')
        .bind(reservation.table_id, tenantId)
        .first<{ status: string }>();

      if (table !== null && canTransitionTable(table.status, 'available')) {
        await updateTableStatus(db, reservation.table_id, tenantId, 'available');
      }
    }
  }

  return { success: true };
}
