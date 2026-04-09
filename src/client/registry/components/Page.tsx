import type { ReactNode } from 'react';

interface PageProps {
  readonly children?: ReactNode;
}

export function Page({ children }: PageProps) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}
