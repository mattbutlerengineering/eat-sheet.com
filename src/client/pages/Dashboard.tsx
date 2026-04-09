import { useSpec } from '../hooks/useSpec';
import { Renderer } from '../registry/renderer';
import { fohRegistry } from '../registry';

export default function Dashboard() {
  const { spec, loading, error } = useSpec('/dashboard');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  if (!spec) return null;

  return <Renderer spec={spec as any} registry={fohRegistry as any} />;
}
