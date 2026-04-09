interface ReservationRowProps {
  readonly id: string;
  readonly guest_name: string;
  readonly party_size: number;
  readonly date: string;
  readonly time: string;
  readonly status: string;
  readonly table_label?: string;
  readonly notes?: string;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  seated:    'bg-blue-100 text-blue-700',
  completed: 'bg-stone-100 text-stone-600',
};

export function ReservationRow({
  guest_name,
  party_size,
  date,
  time,
  status,
  table_label,
  notes,
}: ReservationRowProps) {
  const badgeClass = statusColors[status.toLowerCase()] ?? 'bg-stone-100 text-stone-600';

  return (
    <tr className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
      <td className="py-3 pr-4 font-medium text-stone-900">{guest_name}</td>
      <td className="py-3 pr-4 text-stone-600">{party_size}</td>
      <td className="py-3 pr-4 text-stone-600">{date}</td>
      <td className="py-3 pr-4 text-stone-600">{time}</td>
      <td className="py-3 pr-4">
        {table_label ? (
          <span className="text-stone-600">{table_label}</span>
        ) : (
          <span className="text-stone-400">—</span>
        )}
      </td>
      <td className="py-3 pr-4">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeClass}`}>
          {status}
        </span>
      </td>
      {notes !== undefined && (
        <td className="py-3 text-sm text-stone-400">{notes}</td>
      )}
    </tr>
  );
}
