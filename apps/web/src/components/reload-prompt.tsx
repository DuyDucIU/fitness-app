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
      className="fixed inset-x-3 bottom-[calc(var(--safe-bottom)+12px)] z-50 mx-auto flex max-w-[416px] items-start gap-3 rounded-md bg-tyvek py-3 pr-2 pl-3.5 shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
    >
      <span className="flex-1 self-center leading-[1.4] font-semibold">
        {m.app_update_ready()}
      </span>
      <Button variant="text" onClick={() => setNeedRefresh(false)}>
        {m.common_later()}
      </Button>
      <Button onClick={() => void updateServiceWorker(true)}>
        {m.common_update()}
      </Button>
    </div>
  );
}
