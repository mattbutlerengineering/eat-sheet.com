const VALID_TRANSITIONS: Record<string, string[]> = {
  available: ['reserved', 'occupied', 'blocked'],
  reserved: ['occupied', 'available'],
  occupied: ['available'],
  blocked: ['available'],
};

export function canTransitionTable(currentStatus: string, newStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

export async function updateTableStatus(
  db: D1Database,
  tableId: string,
  tenantId: string,
  newStatus: string
): Promise<void> {
  await db
    .prepare('UPDATE tables SET status = ? WHERE id = ? AND tenant_id = ?')
    .bind(newStatus, tableId, tenantId)
    .run();
}
