import type { ReactNode } from 'react';

export function EmptyState({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{children}</p>
    </div>
  );
}
