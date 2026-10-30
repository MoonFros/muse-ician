import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  description?: string;
  duration?: number;
}

export interface ToastItem {
  id: number;
  message: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = { success: 'check', error: 'warning', info: 'info' } as const;
const TONE_CLASS: Record<ToastTone, string> = {
  success: 'border-ok/40 text-ok',
  error: 'border-danger/50 text-danger',
  info: 'border-accent/40 text-accent-soft',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      counter.current += 1;
      const id = counter.current;
      const item: ToastItem = {
        id,
        message,
        description: options.description,
        tone: options.tone ?? 'info',
      };
      setItems((current) => [...current.slice(-3), item]);
      const duration = options.duration ?? (item.tone === 'error' ? 7000 : 4200);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
          aria-live="polite"
          aria-atomic="false"
        >
          {items.map((item) => (
            <div
              key={item.id}
              role={item.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border bg-[#0b0b16]/95 px-3.5 py-3 shadow-lift backdrop-blur-xl ${
                TONE_CLASS[item.tone]
              }`}
            >
              <Icon name={TONE_ICON[item.tone]} size={16} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-text">{item.message}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-slate-faint transition-colors hover:text-slate-text"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}
