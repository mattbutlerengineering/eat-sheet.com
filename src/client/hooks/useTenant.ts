import { useAuth } from './useAuth';

export function useTenant() {
  const { tenantId, token } = useAuth();

  const switchTenant = async (newTenantId: string): Promise<void> => {
    const res = await fetch('/api/auth/switch-tenant', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenant_id: newTenantId }),
    });
    if (!res.ok) throw new Error('Failed to switch tenant');
    const body = await res.json() as { data: { token: string } };
    localStorage.setItem('auth_token', body.data.token);
    window.location.reload();
  };

  return { tenantId, switchTenant };
}
