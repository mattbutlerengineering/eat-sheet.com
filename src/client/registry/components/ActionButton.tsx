interface ActionButtonProps {
  readonly label: string;
  readonly action: string;
  readonly variant?: 'primary' | 'secondary' | 'danger';
  readonly onClick?: (action: string) => void;
}

const variantClasses = {
  primary:   'bg-stone-900 text-white hover:bg-stone-800 focus-visible:ring-stone-900',
  secondary: 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 focus-visible:ring-stone-400',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
};

export function ActionButton({ label, action, variant = 'primary', onClick }: ActionButtonProps) {
  const handleClick = () => onClick?.(action);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variantClasses[variant]}`}
    >
      {label}
    </button>
  );
}
