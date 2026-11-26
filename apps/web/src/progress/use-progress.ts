import type { ProgressResponse } from '@fitness/contract';
import * as React from 'react';

import { useSyncStatus } from '@/hooks/use-sync-status';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/errors';

/** GET /v1/progress; test thay bằng hàm giả qua context này. */
export const ProgressFetchContext = React.createContext<
  () => Promise<ProgressResponse>
>(api.progress);

export type ProgressState =
  | { status: 'loading' }
  | { status: 'ready'; data: ProgressResponse }
  /** Không tới được server: biểu đồ cần mạng (không có bản trên máy). */
  | { status: 'offline' }
  | { status: 'error' };

/**
 * Số liệu biểu đồ tiến độ (UC19) từ server. Không cache trên máy: offline thì báo cần mạng,
 * có mạng lại (sự kiện `online`) thì tự tải lại. Tải mỗi lần mở màn, và lại lần nữa khi outbox
 * vừa đẩy hết, để buổi vừa xong hiện ngay.
 */
export function useProgress(): {
  state: ProgressState;
  retry: () => void;
} {
  const fetchProgress = React.useContext(ProgressFetchContext);
  const [state, setState] = React.useState<ProgressState>({
    status: 'loading',
  });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    fetchProgress().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        if (cancelled) return;
        const offline = error instanceof ApiError && error.code === 'network';
        setState({ status: offline ? 'offline' : 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fetchProgress, attempt]);

  // Buổi vừa xong có thể còn trong outbox lúc mở màn: đẩy hết lên server thì tải lại.
  const { pending } = useSyncStatus();
  const hadPending = React.useRef(pending > 0);
  React.useEffect(() => {
    if (pending > 0) hadPending.current = true;
    else if (hadPending.current) {
      hadPending.current = false;
      setAttempt((a) => a + 1);
    }
  }, [pending]);

  const ready = state.status === 'ready';
  React.useEffect(() => {
    if (ready) return;
    const onOnline = () => setAttempt((a) => a + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [ready]);

  return { state, retry: () => setAttempt((a) => a + 1) };
}
