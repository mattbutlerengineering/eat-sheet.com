import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

interface FloorPlanItem {
  id: string;
  name: string;
  table_count: number;
  capacity: number;
  active: boolean;
}

export default function FloorPlan() {
  const { apiFetch } = useApi();
  const [floorPlans, setFloorPlans] = useState<FloorPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/floor-plans')
      .then((res) => {
        const typed = res as { data?: FloorPlanItem[] };
        setFloorPlans(typed.data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load floor plans');
        setLoading(false);
      });
  }, [apiFetch]);

  if (loading) {
    return <div className="text-stone-400">Loading floor plans...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Floor Plans</h1>
      </div>
      {floorPlans.length === 0 ? (
        <div className="text-center py-12 text-stone-400">No floor plans configured</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Tables</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Capacity</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {floorPlans.map((fp) => (
                <tr key={fp.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">{fp.name}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{fp.table_count}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{fp.capacity}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        fp.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {fp.active ? 'Active' : 'Inactive'}
                    </span>
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
