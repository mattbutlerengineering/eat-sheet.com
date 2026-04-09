import React from 'react';

interface PageProps {
  readonly children?: React.ReactNode;
}

export function Page({ children }: PageProps) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}
