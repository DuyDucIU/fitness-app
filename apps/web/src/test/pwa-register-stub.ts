/**
 * Thay `virtual:pwa-register/react` khi chạy Vitest (module ảo này chỉ có khi vite-plugin-pwa
 * build). Không có service worker: không bao giờ có bản cập nhật.
 */
export function useRegisterSW() {
  const noop = () => {};
  return {
    needRefresh: [false, noop] as const,
    offlineReady: [false, noop] as const,
    updateServiceWorker: async () => {},
  };
}
