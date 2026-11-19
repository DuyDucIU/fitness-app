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
  /**
   * Đọc ngay một câu cho trình đọc màn hình qua vùng `aria-live="assertive"` ẩn
   * (kit.js › announce), vd khi một set vừa được lưu hay đồng hồ nghỉ kết thúc.
   */
  announce: (text: string) => void;
}

export const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải nằm trong <ToastProvider>');
  return ctx;
}

/** Hàm `announce` của ToastProvider. */
export function useAnnounce(): ToastApi['announce'] {
  return useToast().announce;
}
