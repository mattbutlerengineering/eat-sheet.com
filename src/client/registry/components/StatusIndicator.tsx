interface StatusIndicatorProps {
  readonly status: string;
  readonly size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<string, string> = {
  online:    'bg-green-500',
  active:    'bg-green-500',
  available: 'bg-green-500',
  offline:   'bg-stone-400',
  inactive:  'bg-stone-400',
  busy:      'bg-yellow-500',
  pending:   'bg-yellow-500',
  error:     'bg-red-500',
  closed:    'bg-red-500',
};

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const colorClass = statusColors[status.toLowerCase()] ?? 'bg-stone-400';
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`inline-block rounded-full ${sizeClass} ${colorClass}`}
      role="status"
      aria-label={status}
    />
  );
}
