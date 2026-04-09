import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useTenant } from '../hooks/useTenant';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TenantInfo {
  id: string;
  name: string;
  timezone: string;
}

export default function Settings() {
  const { apiFetch } = useApi();
  const { tenantId } = useTenant();
  const [members, setMembers] = useState<Member[]>([]);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, tenantRes] = await Promise.all([
          apiFetch('/members') as Promise<{ data?: Member[] }>,
          apiFetch(`/api/tenants/${tenantId}`) as Promise<{ data?: TenantInfo }>,
        ]);
        setMembers(membersRes.data ?? []);
        setTenant(tenantRes.data ?? null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiFetch, tenantId]);

  if (loading) {
    return <div className="text-stone-400">Loading settings...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-900">Settings</h1>

      {tenant && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-800">Tenant Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Name
              </label>
              <p className="text-sm text-stone-900">{tenant.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Timezone
              </label>
              <p className="text-sm text-stone-900">{tenant.timezone}</p>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-800">Team Members</h2>
        </div>
        {members.length === 0 ? (
          <div className="text-center py-12 text-stone-400">No team members</div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50">
                  <td className="px-6 py-3 text-sm font-medium text-stone-900">{m.name}</td>
                  <td className="px-6 py-3 text-sm text-stone-600">{m.email}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600 capitalize">
                      {m.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
