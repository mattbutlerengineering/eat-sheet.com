export default function Login() {
  const handleLogin = async () => {
    const res = await fetch('/api/auth/google', { method: 'POST' });
    const { data } = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-900">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-stone-900 text-center">Hospitality</h1>
        <p className="text-stone-500 text-center mt-2 mb-8">Restaurant management platform</p>
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white rounded-lg px-4 py-3 font-medium hover:bg-stone-800 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
