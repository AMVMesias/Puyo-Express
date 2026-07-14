import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const hasCustomBackground = /(?:^|\s)!?bg-/.test(className);
  const backgroundClass = hasCustomBackground ? '' : 'bg-white dark:bg-slate-900';

  return (
    <section className={`rounded-lg border border-slate-200 shadow-sm dark:border-slate-800 ${backgroundClass} ${className}`}>
      {children}
    </section>
  );
}
