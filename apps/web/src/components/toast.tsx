import * as React from 'react';

import {
  ToastContext,
  type ToastApi,
  type ToastState,
} from '@/components/toast-context';
import { cn } from '@/lib/utils';

/**
 * Toast nền mực (prototypes/shared/base.css › .toast, .live): một thông báo một lúc, nằm
 * trên vùng đáy trong cột 440px, có thể kèm một hành động màu cam. Không chặn thao tác.
 * Kèm vùng `aria-live="assertive"` ẩn cho `announce` (kit.js).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Giữ nội dung toast cuối cùng để lúc mờ dần vẫn còn chữ (kit.js chỉ bỏ class `show`).
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');
  const timer = React.useRef<number | undefined>(undefined);
  const announceTimer = React.useRef<number | undefined>(undefined);

  const api = React.useMemo<ToastApi>(
    () => ({
      show(text, { action, durationMs = 2800 } = {}) {
        window.clearTimeout(timer.current);
        setToast({ id: Date.now(), text, action });
        setVisible(true);
        timer.current = window.setTimeout(() => setVisible(false), durationMs);
      },
      hide() {
        window.clearTimeout(timer.current);
        setVisible(false);
      },
      announce(text) {
        // Xoá rồi đặt lại sau một nhịp để trình đọc màn hình đọc cả câu lặp lại.
        window.clearTimeout(announceTimer.current);
        setAnnouncement('');
        announceTimer.current = window.setTimeout(
          () => setAnnouncement(text),
          30,
        );
      },
    }),
    [],
  );

  React.useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(announceTimer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+104px)] z-60 mx-auto flex max-w-[440px] justify-center px-3">
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'on-dark flex items-center gap-3 rounded-sm bg-ink px-3.5 py-2.5 font-semibold text-tyvek [transition:translate_0.26s_var(--ease-snap),opacity_0.2s]',
            visible
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
                  tabIndex={visible ? undefined : -1}
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
      <div aria-live="assertive" className="sr-only">
        {announcement}
      </div>
    </ToastContext.Provider>
  );
}
