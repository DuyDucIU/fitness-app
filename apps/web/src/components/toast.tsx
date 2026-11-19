import * as React from 'react';
import { cn } from '@/lib/utils';

import {
  ToastContext,
  type ToastApi,
  type ToastState,
} from '@/components/toast-context';

/**
 * Toast nền mực (prototypes/shared/base.css › .toast): một thông báo một lúc, nằm trên
 * vùng đáy, có thể kèm một hành động (vd "Hoàn tác") màu cam. Không chặn thao tác.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const timer = React.useRef<number | undefined>(undefined);

  const api = React.useMemo<ToastApi>(
    () => ({
      show(text, { action, durationMs = 2800 } = {}) {
        window.clearTimeout(timer.current);
        setToast({ id: Date.now(), text, action });
        timer.current = window.setTimeout(() => setToast(null), durationMs);
      },
      hide() {
        window.clearTimeout(timer.current);
        setToast(null);
      },
    }),
    [],
  );

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--safe-bottom)+104px)] z-60 flex justify-center">
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'flex items-center gap-3 rounded-sm bg-ink px-3.5 py-2.5 font-semibold text-tyvek transition-[opacity,transform] duration-200 ease-snap',
            toast
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'translate-y-3 opacity-0',
          )}
        >
          {toast && (
            <>
              <span key={toast.id}>{toast.text}</span>
              {toast.action && (
                <button
                  type="button"
                  className="font-bold text-orange"
                  onClick={() => {
                    toast.action?.onClick();
                    api.hide();
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
