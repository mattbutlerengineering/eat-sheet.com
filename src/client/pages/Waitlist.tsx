import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

interface WaitlistEntry {
  id: string;
  position: number;
  guest_name: string;
  party_size: number;
  quoted_wait: number | null;
  phone: string | null;
  status: 'waiting' | 'notified' | 'seated' | 'left';
  notes: string | null;
}

interface AddFormState {
  guest_name: string;
  party_size: string;
  phone: string;
  notes: string;
}

const EMPTY_FORM: AddFormState = {
  guest_name: '',
  party_size: '',
  phone: '',
  notes: '',
};

const STATUS_BADGE: Record<WaitlistEntry['status'], string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  notified: 'bg-blue-100 text-blue-800',
  seated: 'bg-green-100 text-green-800',
  left: 'bg-stone-100 text-stone-500',
};

export default function Waitlist() {
  const { apiFetch } = useApi();

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const loadEntries = useCallback(() => {
    return apiFetch('/waitlist')
      .then((res) => {
        const typed = res as { data?: WaitlistEntry[] };
        setEntries(typed.data ?? []);
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load waitlist');
        setLoading(false);
      });
  }, [apiFetch]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const waitingCount = entries.filter((e) => e.status === 'waiting').length;

  function handleFormChange(field: keyof AddFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const guest_name = form.guest_name.trim();
    const party_size = parseInt(form.party_size, 10);

    if (!guest_name) {
      setFormError('Guest name is required.');
      return;
    }
    if (!form.party_size || isNaN(party_size) || party_size < 1) {
      setFormError('Party size must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          guest_name,
          party_size,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadEntries();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add to waitlist');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setActionError(null);
    try {
      await apiFetch(`/waitlist/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadEntries();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleRemove(id: string) {
    setActionError(null);
    try {
      await apiFetch(`/waitlist/${id}`, { method: 'DELETE' });
      await loadEntries();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove entry');
    }
  }

  if (loading) {
    return <div className="text-stone-400 p-6">Loading waitlist...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg m-6">{error}</div>;
  }

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">Waitlist</h1>
          {waitingCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              {waitingCount} waiting
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
            setForm(EMPTY_FORM);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add to Waitlist'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleAddSubmit(e)}
          className="bg-white border border-stone-200 rounded-xl p-5 space-y-4 shadow-sm"
        >
          <h2 className="text-base font-semibold text-stone-800">New Waitlist Entry</h2>

          {formError && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{formError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="guest_name">
                Guest Name <span className="text-red-500">*</span>
              </label>
              <input
                id="guest_name"
                type="text"
                required
                value={form.guest_name}
                onChange={(e) => handleFormChange('guest_name', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                placeholder="e.g. Smith party"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="party_size">
                Party Size <span className="text-red-500">*</span>
              </label>
              <input
                id="party_size"
                type="number"
                required
                min={1}
                value={form.party_size}
                onChange={(e) => handleFormChange('party_size', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                placeholder="2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="phone">
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                placeholder="555-1234"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="notes">
                Notes (optional)
              </label>
              <input
                id="notes"
                type="text"
                value={form.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                placeholder="High chair needed, allergies, etc."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
                setForm(EMPTY_FORM);
              }}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Adding...' : 'Add to Waitlist'}
            </button>
          </div>
        </form>
      )}

      {/* Action error */}
      {actionError && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{actionError}</div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm">No one on the waitlist</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex gap-4 items-start"
            >
              {/* Position */}
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-stone-100 rounded-xl">
                <span className="text-xl font-bold text-stone-700">{entry.position}</span>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-semibold text-stone-900 text-base">{entry.guest_name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[entry.status]}`}
                  >
                    {entry.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-stone-500">
                  <span>
                    <span className="font-medium text-stone-700">{entry.party_size}</span>{' '}
                    {entry.party_size === 1 ? 'guest' : 'guests'}
                  </span>
                  {entry.quoted_wait != null && (
                    <span>
                      <span className="font-medium text-stone-700">{entry.quoted_wait}</span> min wait
                    </span>
                  )}
                  {entry.phone && <span>{entry.phone}</span>}
                </div>

                {entry.notes && (
                  <p className="text-sm text-stone-400 italic">{entry.notes}</p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {entry.status === 'waiting' && (
                    <>
                      <button
                        onClick={() => void handleStatusChange(entry.id, 'notified')}
                        className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Notify
                      </button>
                      <button
                        onClick={() => void handleStatusChange(entry.id, 'left')}
                        className="px-3 py-1 text-xs font-medium bg-stone-50 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        Left
                      </button>
                    </>
                  )}
                  {entry.status === 'notified' && (
                    <>
                      <button
                        onClick={() => void handleStatusChange(entry.id, 'seated')}
                        className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        Seat
                      </button>
                      <button
                        onClick={() => void handleStatusChange(entry.id, 'left')}
                        className="px-3 py-1 text-xs font-medium bg-stone-50 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        Left
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => void handleRemove(entry.id)}
                    className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
