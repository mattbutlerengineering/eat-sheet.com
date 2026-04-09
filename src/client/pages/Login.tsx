export default function Login() {
  return (
    <div className="flex items-center justify-center h-screen bg-stone-50">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Sign in</h1>
        <p className="text-stone-500 mb-6 text-sm">Welcome to Eat Sheet</p>
        <a
          href="/api/auth/google"
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-colors"
        >
          Continue with Google
        </a>
      </div>
    </div>
  );
}
