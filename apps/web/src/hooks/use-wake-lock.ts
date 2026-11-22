import { useEffect } from 'react';

/**
 * Giữ màn hình sáng khi component đang hiện, bằng Screen Wake Lock nếu trình duyệt hỗ trợ
 * (UC08, SDD 3.3); không hỗ trợ hoặc bị từ chối thì thôi. Trình duyệt tự nhả khoá khi app
 * xuống nền, nên xin lại mỗi khi user quay lại; nhả khi component gỡ khỏi màn hình.
 */
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let requesting = false;
    let mounted = true;

    async function acquire() {
      if (document.visibilityState !== 'visible') return;
      if (requesting || (lock && !lock.released)) return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        // Đã rời màn trong lúc chờ: nhả ngay.
        if (mounted) lock = next;
        else void next.release().catch(() => {});
      } catch {
        // Bị từ chối (vd pin yếu): màn hình tắt theo cài đặt máy.
      } finally {
        requesting = false;
      }
    }

    const onVisibility = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock && !lock.released) void lock.release().catch(() => {});
    };
  }, []);
}
