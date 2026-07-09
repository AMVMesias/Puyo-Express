import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

function FieldShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const controlClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-emerald-500/20';

export function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <FieldShell label={label}>
      <input className={controlClass} {...props} />
    </FieldShell>
  );
}

export function Select({
  children,
  label,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; label: string }) {
  return (
    <FieldShell label={label}>
      <select className={controlClass} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Textarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <FieldShell label={label}>
      <textarea className={`${controlClass} resize-none`} {...props} />
    </FieldShell>
  );
}
