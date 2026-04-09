interface BadgeProps {
  readonly text: string;
  readonly color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

const colorClasses = {
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  gray:   'bg-stone-100 text-stone-600',
};

export function Badge({ text, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}>
      {text}
    </span>
  );
}
