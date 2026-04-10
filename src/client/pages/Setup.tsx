import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Setup() {
  const { token, login } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Create tenant
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      const body = await res.json() as { success: boolean; data?: { id: string }; error?: string };
      if (!res.ok || !body.data?.id) {
        setError(body.error ?? 'Failed to create restaurant');
        setLoading(false);
        return;
      }

      // Switch to the new tenant to get a JWT with tenantId
      const switchRes = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: body.data.id }),
      });
      const switchBody = await switchRes.json() as { success: boolean; data?: { token: string }; error?: string };
      if (!switchRes.ok || !switchBody.data?.token) {
        setError(switchBody.error ?? 'Failed to activate restaurant');
        setLoading(false);
        return;
      }

      login(switchBody.data.token);
      window.location.href = '/';
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-900">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-stone-900 text-center">Set Up Your Restaurant</h1>
        <p className="text-stone-500 text-center mt-2 mb-6">Create your first restaurant to get started.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Restaurant Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (!slug) handleSlugChange(e.target.value.replace(/\s+/g, '-')); }}
              placeholder="Mario's Trattoria"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">URL Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="marios-trattoria"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
              required
            />
            <p className="text-xs text-stone-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || !slug.trim()}
            className="w-full bg-stone-900 text-white rounded-lg px-4 py-3 font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Restaurant'}
          </button>
        </form>
      </div>
    </div>
  );
}
