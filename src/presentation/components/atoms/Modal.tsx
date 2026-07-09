import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

export function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <IconButton icon={<X className="h-4 w-4" />} label="Cerrar" onClick={onClose} />
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
