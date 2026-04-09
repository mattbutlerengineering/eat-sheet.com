import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

interface WaitlistEntry {
  id: string;
  position: number;
  guest_name: string;
  party_size: number;
  wait_time: number | null;
  status: string;
  notes: string | null;
}

export default function Waitlist() {
  const { apiFetch } = useApi();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/waitlist')
      .then((res) => {
        const typed = res as { data?: WaitlistEntry[] };
        setEntries(typed.data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load waitlist');
        setLoading(false);
      });
  }, [apiFetch]);

  if (loading) {
    return <div className="text-stone-400">Loading waitlist...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Waitlist</h1>
        {entries.length > 0 && (
          <span className="text-sm text-stone-500">{entries.length} waiting</span>
        )}
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-12 text-stone-400">Waitlist is empty</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">#</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Guest</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Party</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Est. Wait</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-sm font-bold text-stone-500">{e.position}</td>
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">{e.guest_name}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{e.party_size}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {e.wait_time != null ? `${e.wait_time} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">{e.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
