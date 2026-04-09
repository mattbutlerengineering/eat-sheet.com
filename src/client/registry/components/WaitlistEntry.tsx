interface WaitlistEntryProps {
  readonly id: string;
  readonly guest_name: string;
  readonly party_size: number;
  readonly position: number;
  readonly quoted_wait?: number;
  readonly status: string;
  readonly phone?: string;
}

export function WaitlistEntry({
  guest_name,
  party_size,
  position,
  quoted_wait,
  status,
  phone,
}: WaitlistEntryProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg font-bold text-stone-600">
        {position}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-900">{guest_name}</p>
        <p className="text-sm text-stone-500">
          Party of {party_size}
          {phone && ` · ${phone}`}
        </p>
      </div>
      <div className="text-right">
        {quoted_wait !== undefined && (
          <p className="text-sm font-medium text-stone-700">{quoted_wait} min</p>
        )}
        <p className="text-xs capitalize text-stone-400">{status}</p>
      </div>
    </div>
  );
}
