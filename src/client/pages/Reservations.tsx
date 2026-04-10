import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

interface Reservation {
  id: string;
  guest_name: string;
  party_size: number;
  time: string;
  status: string;
  table_number: string | null;
  notes: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  seated: 'bg-green-100 text-green-700',
  completed: 'bg-stone-100 text-stone-600',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-stone-200 text-stone-500',
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

interface FormState {
  guest_name: string;
  party_size: string;
  time: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  guest_name: '',
  party_size: '2',
  time: '',
  notes: '',
};

export default function Reservations() {
  const { apiFetch } = useApi();
  const [date, setDate] = useState<string>(todayStr);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadReservations = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/reservations?date=${date}`)
      .then((res) => {
        const typed = res as { data?: Reservation[] };
        setReservations(typed.data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load reservations');
        setLoading(false);
      });
  }, [apiFetch, date]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  function handleFormChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const guestName = form.guest_name.trim();
    const partySize = parseInt(form.party_size, 10);

    if (!guestName) {
      setFormError('Guest name is required.');
      return;
    }
    if (!form.time) {
      setFormError('Reservation time is required.');
      return;
    }
    if (isNaN(partySize) || partySize < 1) {
      setFormError('Party size must be at least 1.');
      return;
    }

    setSubmitting(true);
    try {
      const guestRes = await apiFetch('/guests', {
        method: 'POST',
        body: JSON.stringify({ name: guestName }),
      }) as { data?: { id: string } };

      const guestId = guestRes.data?.id;
      if (!guestId) throw new Error('Failed to create guest');

      await apiFetch('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          guest_id: guestId,
          party_size: partySize,
          date,
          time: form.time,
          notes: form.notes.trim() || null,
        }),
      });

      setForm(EMPTY_FORM);
      setShowForm(false);
      loadReservations();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setActionError(null);
    try {
      await apiFetch(`/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadReservations();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await apiFetch(`/reservations/${id}`, { method: 'DELETE' });
      loadReservations();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete reservation');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reservations</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-stone-300 rounded-md px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setFormError(null); setForm(EMPTY_FORM); }}
            className="bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Reservation'}
          </button>
        </div>
      </div>

      {/* New reservation form */}
      {showForm && (
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-base font-semibold text-stone-800 mb-4">New Reservation</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1" htmlFor="guest_name">
                Guest Name
              </label>
              <input
                id="guest_name"
                type="text"
                value={form.guest_name}
                onChange={(e) => handleFormChange('guest_name', e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1" htmlFor="party_size">
                Party Size
              </label>
              <input
                id="party_size"
                type="number"
                min={1}
                max={99}
                value={form.party_size}
                onChange={(e) => handleFormChange('party_size', e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1" htmlFor="res_time">
                Time
              </label>
              <input
                id="res_time"
                type="time"
                value={form.time}
                onChange={(e) => handleFormChange('time', e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1" htmlFor="notes">
                Notes <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                id="notes"
                type="text"
                value={form.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Allergy info, occasion…"
                className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-1.5 rounded-md transition-colors"
              >
                {submitting ? 'Saving…' : 'Save Reservation'}
              </button>
              {formError && (
                <span className="text-sm text-red-600">{formError}</span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg">
          {actionError}
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="text-stone-400 text-sm py-8 text-center">Loading reservations…</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-base font-medium">No reservations for this date</p>
          <p className="text-sm mt-1">Use the button above to add one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Guest</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Party</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Table</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50 align-middle">
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">{r.guest_name}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{r.time}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{r.party_size}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{r.table_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[r.status] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500 max-w-[180px] truncate">{r.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {(r.status === 'confirmed' || r.status === 'seated') && (
                        <>
                          {r.status === 'confirmed' && (
                            <ActionButton
                              label="Seat"
                              onClick={() => handleStatusChange(r.id, 'seated')}
                              color="green"
                            />
                          )}
                          {r.status === 'seated' && (
                            <ActionButton
                              label="Complete"
                              onClick={() => handleStatusChange(r.id, 'completed')}
                              color="stone"
                            />
                          )}
                          <ActionButton
                            label="No Show"
                            onClick={() => handleStatusChange(r.id, 'no_show')}
                            color="amber"
                          />
                          {r.status === 'confirmed' && (
                            <ActionButton
                              label="Cancel"
                              onClick={() => handleStatusChange(r.id, 'cancelled')}
                              color="red"
                            />
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        aria-label="Delete reservation"
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  color: 'green' | 'stone' | 'amber' | 'red';
}

const COLOR_CLASSES: Record<ActionButtonProps['color'], string> = {
  green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
  stone: 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200',
  amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
  red: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
};

function ActionButton({ label, onClick, color }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${COLOR_CLASSES[color]}`}
    >
      {label}
    </button>
  );
}
