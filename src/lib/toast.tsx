import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertTriangle, X, XCircle } from 'lucide-react';
import { cn } from './utils';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';
interface Toast { id: number; title: string; body?: string; tone: ToastTone; }

const ToastCtx = createContext<{ toast: (title: string, opts?: { body?: string; tone?: ToastTone }) => void }>({ toast: () => {} });

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: XCircle } as const;
const TONES: Record<ToastTone, string> = {
  success: 'border-pine-600/30 bg-pine-50 text-pine-800',
  info: 'border-sky-600/25 bg-sky-50 text-sky-900',
  warning: 'border-gold-500/40 bg-amber-50 text-amber-900',
  error: 'border-clay-500/30 bg-orange-50 text-orange-900',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((title: string, opts?: { body?: string; tone?: ToastTone }) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, title, body: opts?.body, tone: opts?.tone ?? 'success' }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4600);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div key={t.id} role="status" className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lift backdrop-blur animate-[fadeSlide_.3s_ease]', TONES[t.tone])}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs leading-snug opacity-80">{t.body}</p>}
              </div>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="rounded-md p-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes fadeSlide { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }`}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() { return useContext(ToastCtx); }
