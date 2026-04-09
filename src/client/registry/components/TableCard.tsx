type TableStatus = 'available' | 'occupied' | 'reserved' | 'blocked';

interface TableCardProps {
  readonly id: string;
  readonly label: string;
  readonly capacity: number;
  readonly status: TableStatus;
  readonly section?: string;
}

const statusConfig: Record<TableStatus, { bg: string; text: string; badge: string; label: string }> = {
  available: { bg: 'bg-green-50 border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-700', label: 'Available' },
  occupied:  { bg: 'bg-red-50 border-red-200',   text: 'text-red-900',   badge: 'bg-red-100 text-red-700',   label: 'Occupied'  },
  reserved:  { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-700', label: 'Reserved' },
  blocked:   { bg: 'bg-stone-50 border-stone-200', text: 'text-stone-700', badge: 'bg-stone-100 text-stone-600', label: 'Blocked'  },
};

export function TableCard({ label, capacity, status, section }: TableCardProps) {
  const config = statusConfig[status];

  return (
    <div className={`rounded-lg border-2 p-4 ${config.bg}`}>
      <div className="flex items-start justify-between">
        <span className={`text-lg font-bold ${config.text}`}>{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
          {config.label}
        </span>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {capacity} {capacity === 1 ? 'seat' : 'seats'}
        {section && ` · ${section}`}
      </p>
    </div>
  );
}
