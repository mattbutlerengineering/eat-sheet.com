import { useState, useEffect } from 'react';
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

export default function Reservations() {
  const { apiFetch } = useApi();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    apiFetch(`/reservations?date=${today}`)
      .then((res) => {
        const typed = res as { data?: Reservation[] };
        setReservations(typed.data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load reservations');
        setLoading(false);
      });
  }, [apiFetch, today]);

  if (loading) {
    return <div className="text-stone-400">Loading reservations...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reservations</h1>
          <p className="text-sm text-stone-500 mt-0.5">{today}</p>
        </div>
      </div>
      {reservations.length === 0 ? (
        <div className="text-center py-12 text-stone-400">No reservations for today</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Guest</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Party</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Table</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">{r.guest_name}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{r.time}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{r.party_size}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{r.table_number ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
