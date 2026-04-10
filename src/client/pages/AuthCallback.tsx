import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('oauth_state');
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    if (!code || !state || !codeVerifier) {
      setError('Missing OAuth parameters. Please try logging in again.');
      return;
    }

    if (state !== savedState) {
      setError('OAuth state mismatch. Please try logging in again.');
      return;
    }

    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_code_verifier');

    fetch('/api/auth/google/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state, code_verifier: codeVerifier }),
    })
      .then(async (res) => {
        const body = await res.json() as { success: boolean; data?: { token?: string }; error?: string };
        if (!res.ok || !body.data?.token) {
          setError(body.error ?? 'Login failed. Please try again.');
          return;
        }
        localStorage.setItem('auth_token', body.data.token);
        navigate('/', { replace: true });
      })
      .catch(() => {
        setError('Network error. Please try again.');
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-900">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/login" className="text-stone-600 underline">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-900">
      <div className="text-stone-400">Signing you in...</div>
    </div>
  );
}
