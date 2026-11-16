import { useRegisterSW } from 'virtual:pwa-register/react';

import { Button } from '@/components/ui/button';

/**
 * Báo có bản cập nhật; chỉ reload khi user đồng ý (registerType: 'prompt', SDD 3.3)
 * để không reload giữa buổi tập.
 */
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg"
    >
      <span className="flex-1 text-sm">Có bản cập nhật mới.</span>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Để sau
      </Button>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Cập nhật
      </Button>
    </div>
  );
}
