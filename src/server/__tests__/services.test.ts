import { describe, it, expect } from 'vitest';
import { canTransitionTable, updateTableStatus } from '../services/table-service';
import {
  canTransitionReservation,
  transitionReservation,
} from '../services/reservation-service';
import { getAvailableSlots } from '../services/availability-service';
import { createMockDb } from './helpers/mock-db';

// ---------------------------------------------------------------------------
// table-service
// ---------------------------------------------------------------------------

describe('canTransitionTable', () => {
  describe('valid transitions', () => {
    it('available → reserved', () => {
      expect(canTransitionTable('available', 'reserved')).toBe(true);
    });

    it('available → occupied', () => {
      expect(canTransitionTable('available', 'occupied')).toBe(true);
    });

    it('available → blocked', () => {
      expect(canTransitionTable('available', 'blocked')).toBe(true);
    });

    it('reserved → occupied', () => {
      expect(canTransitionTable('reserved', 'occupied')).toBe(true);
    });

    it('reserved → available', () => {
      expect(canTransitionTable('reserved', 'available')).toBe(true);
    });

    it('occupied → available', () => {
      expect(canTransitionTable('occupied', 'available')).toBe(true);
    });

    it('blocked → available', () => {
      expect(canTransitionTable('blocked', 'available')).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('occupied → reserved', () => {
      expect(canTransitionTable('occupied', 'reserved')).toBe(false);
    });

    it('blocked → occupied', () => {
      expect(canTransitionTable('blocked', 'occupied')).toBe(false);
    });

    it('reserved → blocked', () => {
      expect(canTransitionTable('reserved', 'blocked')).toBe(false);
    });

    it('unknown status', () => {
      expect(canTransitionTable('nonexistent', 'available')).toBe(false);
    });
  });
});

describe('updateTableStatus', () => {
  it('calls UPDATE tables with correct SQL and parameters', async () => {
    const { db, calls } = createMockDb();
    await updateTableStatus(db, 'table-1', 'tenant-1', 'occupied');

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.sql).toContain('UPDATE tables');
    expect(call.sql).toContain('status = ?');
    expect(call.params).toEqual(['occupied', 'table-1', 'tenant-1']);
  });
});

// ---------------------------------------------------------------------------
// reservation-service
// ---------------------------------------------------------------------------

describe('canTransitionReservation', () => {
  describe('valid transitions', () => {
    it('confirmed → seated', () => {
      expect(canTransitionReservation('confirmed', 'seated')).toBe(true);
    });

    it('confirmed → cancelled', () => {
      expect(canTransitionReservation('confirmed', 'cancelled')).toBe(true);
    });

    it('confirmed → no_show', () => {
      expect(canTransitionReservation('confirmed', 'no_show')).toBe(true);
    });

    it('seated → completed', () => {
      expect(canTransitionReservation('seated', 'completed')).toBe(true);
    });

    it('seated → no_show', () => {
      expect(canTransitionReservation('seated', 'no_show')).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('completed → seated', () => {
      expect(canTransitionReservation('completed', 'seated')).toBe(false);
    });

    it('cancelled → confirmed', () => {
      expect(canTransitionReservation('cancelled', 'confirmed')).toBe(false);
    });

    it('no_show → seated', () => {
      expect(canTransitionReservation('no_show', 'seated')).toBe(false);
    });

    it('unknown status', () => {
      expect(canTransitionReservation('pending', 'confirmed')).toBe(false);
    });
  });
});

describe('transitionReservation', () => {
  const tenantId = 'tenant-1';
  const reservationId = 'res-1';
  const tableId = 'table-1';
  const guestId = 'guest-1';

  it('returns error for non-existent reservation', async () => {
    const { db } = createMockDb({
      first: { reservations: null },
    });

    const result = await transitionReservation(db, tenantId, reservationId, 'seated');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Reservation not found');
  });

  it('returns error for invalid transition', async () => {
    const { db } = createMockDb({
      first: {
        reservations: { id: reservationId, status: 'completed', table_id: tableId, guest_id: guestId },
      },
    });

    const result = await transitionReservation(db, tenantId, reservationId, 'seated');

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition reservation from 'completed' to 'seated'");
  });

  it('transition to seated sets table to occupied and increments visit_count', async () => {
    const { db, calls } = createMockDb({
      first: {
        reservations: { id: reservationId, status: 'confirmed', table_id: tableId, guest_id: guestId },
        tables: { status: 'reserved' },
      },
    });

    const result = await transitionReservation(db, tenantId, reservationId, 'seated');

    expect(result.success).toBe(true);

    const updateReservationCall = calls.find(
      (c) => c.sql.includes('UPDATE reservations') && c.params.includes('seated')
    );
    expect(updateReservationCall).toBeDefined();

    const updateTableCall = calls.find(
      (c) => c.sql.includes('UPDATE tables') && c.params.includes('occupied')
    );
    expect(updateTableCall).toBeDefined();

    const updateVisitCountCall = calls.find(
      (c) => c.sql.includes('UPDATE guests') && c.sql.includes('visit_count')
    );
    expect(updateVisitCountCall).toBeDefined();
  });

  it('transition to completed sets table to available and updates last_visit_at', async () => {
    const { db, calls } = createMockDb({
      first: {
        reservations: { id: reservationId, status: 'seated', table_id: tableId, guest_id: guestId },
        tables: { status: 'occupied' },
      },
    });

    const result = await transitionReservation(db, tenantId, reservationId, 'completed');

    expect(result.success).toBe(true);

    const updateTableCall = calls.find(
      (c) => c.sql.includes('UPDATE tables') && c.params.includes('available')
    );
    expect(updateTableCall).toBeDefined();

    const updateGuestCall = calls.find(
      (c) => c.sql.includes('UPDATE guests') && c.sql.includes('last_visit_at')
    );
    expect(updateGuestCall).toBeDefined();
  });

  it('transition to cancelled frees the table', async () => {
    const { db, calls } = createMockDb({
      first: {
        reservations: { id: reservationId, status: 'confirmed', table_id: tableId, guest_id: guestId },
        tables: { status: 'reserved' },
      },
    });

    const result = await transitionReservation(db, tenantId, reservationId, 'cancelled');

    expect(result.success).toBe(true);

    const updateTableCall = calls.find(
      (c) => c.sql.includes('UPDATE tables') && c.params.includes('available')
    );
    expect(updateTableCall).toBeDefined();
  });

  it('transition to no_show frees the table when one is assigned', async () => {
    const { db, calls } = createMockDb({
      first: {
        reservations: { id: reservationId, status: 'confirmed', table_id: tableId, guest_id: guestId },
        tables: { status: 'reserved' },
      },
    });

    const result = await transitionReservation(db, tenantId, reservationId, 'no_show');

    expect(result.success).toBe(true);

    const updateTableCall = calls.find(
      (c) => c.sql.includes('UPDATE tables') && c.params.includes('available')
    );
    expect(updateTableCall).toBeDefined();
  });

  it('transition to seated without a table still increments visit_count', async () => {
    const { db, calls } = createMockDb({
      first: {
        reservations: { id: reservationId, status: 'confirmed', table_id: null, guest_id: guestId },
      },
    });

    const result = await transitionReservation(db, tenantId, reservationId, 'seated');

    expect(result.success).toBe(true);

    const updateVisitCountCall = calls.find(
      (c) => c.sql.includes('UPDATE guests') && c.sql.includes('visit_count')
    );
    expect(updateVisitCountCall).toBeDefined();

    const updateTableCall = calls.find((c) => c.sql.includes('UPDATE tables'));
    expect(updateTableCall).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// availability-service
// ---------------------------------------------------------------------------

describe('getAvailableSlots', () => {
  const tenantId = 'tenant-1';
  // 2025-03-10 is a Monday (day 1)
  const date = '2025-03-10';
  const partySize = 2;

  it('returns empty array when no service periods exist for the day', async () => {
    const { db } = createMockDb({
      all: {
        service_periods: [],
        tables: [],
        reservations: [],
      },
    });

    const slots = await getAvailableSlots(db, tenantId, date, partySize);
    expect(slots).toEqual([]);
  });

  it('returns empty array when no tables fit the party size', async () => {
    const { db } = createMockDb({
      all: {
        service_periods: [
          { start_time: '18:00', end_time: '21:00', reservation_interval: 30, turn_time: 60 },
        ],
        tables: [],
        reservations: [],
      },
    });

    const slots = await getAvailableSlots(db, tenantId, date, partySize);
    expect(slots).toEqual([]);
  });

  it('returns correct time slots based on service period start/end/interval', async () => {
    const { db } = createMockDb({
      all: {
        service_periods: [
          { start_time: '18:00', end_time: '20:00', reservation_interval: 30, turn_time: 60 },
        ],
        // Two eligible tables
        tables: [{ id: 'table-a' }, { id: 'table-b' }],
        reservations: [],
      },
    });

    const slots = await getAvailableSlots(db, tenantId, date, partySize);

    // Slots from 18:00 up to and including end_time - turn_time = 19:00, every 30 min
    // Expected: 18:00, 18:30, 19:00
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ time: '18:00', available_tables: 2 });
    expect(slots[1]).toEqual({ time: '18:30', available_tables: 2 });
    expect(slots[2]).toEqual({ time: '19:00', available_tables: 2 });
  });

  it('marks slots as unavailable when reservations exist', async () => {
    const { db } = createMockDb({
      all: {
        service_periods: [
          { start_time: '18:00', end_time: '20:00', reservation_interval: 30, turn_time: 60 },
        ],
        tables: [{ id: 'table-a' }, { id: 'table-b' }],
        // table-a is booked at 18:00 for a 60-min turn, so it occupies [18:00, 19:00)
        reservations: [{ time: '18:00', table_id: 'table-a' }],
      },
    });

    const slots = await getAvailableSlots(db, tenantId, date, partySize);

    // The overlap condition is: resMinutes < slotMinutes + turnTime && resMinutes + turnTime > slotMinutes
    // For a reservation at 18:00 with 60-min turn (occupies [18:00, 19:00)):
    //   18:00 slot → overlaps (1080 < 1140 && 1140 > 1080)
    //   18:30 slot → overlaps (1080 < 1170 && 1140 > 1110)
    //   19:00 slot → does NOT overlap (1080 + 60 = 1140, which is NOT > 1140, strict inequality)
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ time: '18:00', available_tables: 1 });
    expect(slots[1]).toEqual({ time: '18:30', available_tables: 1 });
    expect(slots[2]).toEqual({ time: '19:00', available_tables: 2 });
  });

  it('does not count reservations for tables outside the eligible set', async () => {
    const { db } = createMockDb({
      all: {
        service_periods: [
          { start_time: '18:00', end_time: '20:00', reservation_interval: 30, turn_time: 60 },
        ],
        tables: [{ id: 'table-a' }],
        // table-b is not in the eligible set
        reservations: [{ time: '18:00', table_id: 'table-b' }],
      },
    });

    const slots = await getAvailableSlots(db, tenantId, date, partySize);

    expect(slots).toHaveLength(3);
    slots.forEach((slot) => {
      expect(slot.available_tables).toBe(1);
    });
  });

  it('does not count reservations with null table_id', async () => {
    const { db } = createMockDb({
      all: {
        service_periods: [
          { start_time: '18:00', end_time: '20:00', reservation_interval: 30, turn_time: 60 },
        ],
        tables: [{ id: 'table-a' }],
        reservations: [{ time: '18:00', table_id: null }],
      },
    });

    const slots = await getAvailableSlots(db, tenantId, date, partySize);

    expect(slots).toHaveLength(3);
    slots.forEach((slot) => {
      expect(slot.available_tables).toBe(1);
    });
  });

  it('generates slots correctly for multiple service periods', async () => {
    const { db } = createMockDb({
      all: {
        service_periods: [
          { start_time: '12:00', end_time: '14:00', reservation_interval: 60, turn_time: 60 },
          { start_time: '18:00', end_time: '20:00', reservation_interval: 60, turn_time: 60 },
        ],
        tables: [{ id: 'table-a' }],
        reservations: [],
      },
    });

    const slots = await getAvailableSlots(db, tenantId, date, partySize);

    // Lunch: 12:00, 13:00 (lastSlot = 14:00 - 60 = 13:00)
    // Dinner: 18:00, 19:00
    expect(slots).toHaveLength(4);
    expect(slots[0]!.time).toBe('12:00');
    expect(slots[1]!.time).toBe('13:00');
    expect(slots[2]!.time).toBe('18:00');
    expect(slots[3]!.time).toBe('19:00');
  });
});
