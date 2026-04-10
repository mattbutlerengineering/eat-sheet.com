import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[] | null;
  notes: string | null;
  visit_count: number;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  tags: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  tags: '',
  notes: '',
};

export default function Guests() {
  const { apiFetch } = useApi();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGuests = useCallback(
    (q: string) => {
      const path = q.trim() ? `/guests?search=${encodeURIComponent(q.trim())}` : '/guests';
      setLoading(true);
      setError(null);
      apiFetch(path)
        .then((res) => {
          const typed = res as { data?: Guest[] };
          setGuests(typed.data ?? []);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load guests');
        })
        .finally(() => setLoading(false));
    },
    [apiFetch],
  );

  useEffect(() => {
    loadGuests(search);
  }, [loadGuests, search]);

  function handleFieldChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancelForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        tags: form.tags.trim()
          ? form.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        notes: form.notes.trim() || null,
      };
      await apiFetch('/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadGuests(search);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create guest');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(guest: Guest) {
    if (!window.confirm(`Delete guest "${guest.name}"? This cannot be undone.`)) return;
    setDeletingId(guest.id);
    try {
      await apiFetch(`/guests/${guest.id}`, { method: 'DELETE' });
      loadGuests(search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete guest');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-900">Guests</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Guest'}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-stone-50 border border-stone-200 rounded-lg p-5 space-y-4"
          noValidate
        >
          <h2 className="text-base font-semibold text-stone-800">New Guest</h2>

          {formError && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{formError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="jane@example.com"
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Tags{' '}
                <span className="text-stone-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => handleFieldChange('tags', e.target.value)}
                placeholder="vip, regular, gluten-free"
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Any special preferences or notes…"
              rows={3}
              className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Guest'}
            </button>
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search bar */}
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guests by name, email, or tag…"
          className="w-full sm:max-w-sm border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && <div className="text-stone-400 text-sm">Loading…</div>}

      {/* Guest list */}
      {!loading && !error && guests.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-stone-500 text-lg font-medium">No guests yet</p>
          <p className="text-stone-400 text-sm">
            {search.trim()
              ? 'No guests match your search. Try a different term.'
              : 'Add your first guest to start tracking visits and preferences.'}
          </p>
          {!search.trim() && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-colors"
            >
              + Add First Guest
            </button>
          )}
        </div>
      )}

      {!loading && guests.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Tags</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Visits</th>
                <th className="sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">{g.name}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{g.email ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{g.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {g.tags && g.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {g.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">{g.visit_count}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(g)}
                      disabled={deletingId === g.id}
                      className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                      aria-label={`Delete ${g.name}`}
                    >
                      {deletingId === g.id ? 'Deleting…' : 'Delete'}
                    </button>
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
