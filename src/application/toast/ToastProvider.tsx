import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'warning' | 'info';

interface Toast {
  id: string;
  text: string;
  type: ToastType;
}

interface ToastContextValue {
  notify(text: string, type?: ToastType): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, type: ToastType = 'success') => {
      const id = crypto.randomUUID();
      setToasts((currentToasts) => [...currentToasts, { id, text, type }]);
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const Icon =
            toast.type === 'success' ? CheckCircle2 : toast.type === 'warning' ? AlertTriangle : Info;

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm shadow-lg ${
                toast.type === 'success'
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : toast.type === 'warning'
                    ? 'border-amber-400 bg-amber-500 text-white'
                    : 'border-slate-700 bg-slate-900 text-white'
              }`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0 flex-1 font-medium leading-snug">{toast.text}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded p-0.5 opacity-80 transition hover:bg-white/10 hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }

  return context;
}
