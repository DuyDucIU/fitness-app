import * as React from 'react';

export interface ToastState {
  id: number;
  text: React.ReactNode;
  action?: { label: React.ReactNode; onClick: () => void };
}

export interface ToastApi {
  /** Hiện một thông báo ngắn trên vùng đáy; thông báo mới thay thông báo cũ. */
  show: (
    text: React.ReactNode,
    options?: { action?: ToastState['action']; durationMs?: number },
  ) => void;
  hide: () => void;
}

export const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải nằm trong <ToastProvider>');
  return ctx;
}
