interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      )}
    </div>
  );
}
