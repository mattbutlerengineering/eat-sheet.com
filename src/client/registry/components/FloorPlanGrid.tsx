import { TableCard } from './TableCard';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'blocked';

interface TableEntry {
  readonly id: string;
  readonly label: string;
  readonly capacity: number;
  readonly status: TableStatus;
  readonly section?: string;
}

interface FloorPlanGridProps {
  readonly tables: TableEntry[];
}

export function FloorPlanGrid({ tables }: FloorPlanGridProps) {
  if (tables.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-stone-400">No tables configured.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tables.map((table) => (
        <TableCard key={table.id} {...table} />
      ))}
    </div>
  );
}
