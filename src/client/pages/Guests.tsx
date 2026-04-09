import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  visit_count: number;
}

export default function Guests() {
  const { apiFetch } = useApi();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/guests')
      .then((res) => {
        const typed = res as { data?: Guest[] };
        setGuests(typed.data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load guests');
        setLoading(false);
      });
  }, [apiFetch]);

  if (loading) {
    return <div className="text-stone-400">Loading...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Guests</h1>
      </div>
      {guests.length === 0 ? (
        <div className="text-center py-12 text-stone-400">No guests yet</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Visits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">{g.name}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{g.email ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{g.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{g.visit_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
