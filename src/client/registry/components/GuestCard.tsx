interface GuestCardProps {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly visit_count: number;
  readonly tags?: string[];
}

export function GuestCard({ name, email, phone, visit_count, tags }: GuestCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-stone-900">{name}</p>
          {email && <p className="text-sm text-stone-500">{email}</p>}
          {phone && <p className="text-sm text-stone-500">{phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-stone-900">{visit_count}</p>
          <p className="text-xs text-stone-400">{visit_count === 1 ? 'visit' : 'visits'}</p>
        </div>
      </div>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
