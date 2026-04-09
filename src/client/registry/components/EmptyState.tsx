interface EmptyStateProps {
  readonly message: string;
  readonly icon?: string;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <span className="mb-3 text-4xl" aria-hidden="true">{icon}</span>
      )}
      <p className="text-sm text-stone-400">{message}</p>
    </div>
  );
}
