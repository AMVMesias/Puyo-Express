import type { ReactNode } from 'react';

export function MetricTile({
  icon,
  label,
  tone = 'slate',
  value,
}: {
  icon?: ReactNode;
  label: string;
  tone?: 'emerald' | 'amber' | 'slate';
  value: string;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-white text-slate-800';

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</span>
        {icon}
      </div>
      <strong className="mt-1 block text-xl font-black">{value}</strong>
    </div>
  );
}
