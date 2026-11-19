import { useRegisterSW } from 'virtual:pwa-register/react';

import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';

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
      <span className="flex-1 text-sm">{m.app_update_ready()}</span>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        {m.common_later()}
      </Button>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        {m.common_update()}
      </Button>
    </div>
  );
}
