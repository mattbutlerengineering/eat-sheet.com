interface StatCardProps {
  readonly label: string;
  readonly value: number;
  readonly total?: number;
  readonly icon?: string;
}

export function StatCard({ label, value, total, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        {icon && (
          <span className="text-xl" aria-hidden="true">{icon}</span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold text-stone-900">
        {value}
        {total !== undefined && (
          <span className="ml-1 text-lg font-normal text-stone-400">/ {total}</span>
        )}
      </p>
    </div>
  );
}
