import type { ReactNode } from 'react';

interface CardGridProps {
  readonly columns?: number;
  readonly children?: ReactNode;
}

export function CardGrid({ columns = 3, children }: CardGridProps) {
  const gridClass = columns === 1
    ? 'grid-cols-1'
    : columns === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : columns === 4
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {children}
    </div>
  );
}
