import * as React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import {
  AppUpdateContext,
  useAppUpdate,
} from '@/components/app-update-context';
import { Banner } from '@/components/banner';
import { DownloadIcon } from '@/components/icons';
import { useToast } from '@/components/toast-context';
import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';

/** Đánh dấu qua lần tải lại để báo "Updated." sau khi bản mới chạy. */
const UPDATED_FLAG = 'app-updated';

/**
 * Đăng ký service worker một lần cho cả app và giữ trạng thái "có bản cập nhật".
 * Banner hiển thị ở màn Today (prototypes/home), không tự reload giữa buổi tập.
 */
export function AppUpdateProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const {
    needRefresh: [ready],
    updateServiceWorker,
  } = useRegisterSW();

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(UPDATED_FLAG)) {
        sessionStorage.removeItem(UPDATED_FLAG);
        toast.show(m.app_updated());
      }
    } catch {
      // sessionStorage có thể bị chặn; chỉ mất câu báo "Updated."
    }
  }, [toast]);

  const value = React.useMemo(
    () => ({
      ready,
      update: () => {
        try {
          sessionStorage.setItem(UPDATED_FLAG, '1');
        } catch {
          // bỏ qua
        }
        void updateServiceWorker(true);
      },
    }),
    [ready, updateServiceWorker],
  );

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
    </AppUpdateContext.Provider>
  );
}

/**
 * Banner "Update ready" (prototypes/home/index.html). Khi đang có buổi tập thì không có
 * nút: bản mới cài sau khi kết thúc buổi, để không reload giữa chừng.
 */
export function UpdateBanner({
  workoutInProgress = false,
}: {
  /** Nối với trạng thái buổi tập khi làm tính năng ghi buổi tập. */
  workoutInProgress?: boolean;
}) {
  const { ready, update } = useAppUpdate();
  const [busy, setBusy] = React.useState(false);
  if (!ready) return null;

  return (
    <Banner
      icon={<DownloadIcon aria-hidden />}
      title={m.app_update_title()}
      action={
        workoutInProgress ? undefined : (
          <Button
            busy={busy}
            onClick={() => {
              setBusy(true);
              update();
            }}
          >
            {m.common_update()}
          </Button>
        )
      }
    >
      {workoutInProgress ? m.app_update_after_workout() : m.app_update_body()}
    </Banner>
  );
}
