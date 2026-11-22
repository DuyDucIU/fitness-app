import { SYNC_PUSH_MAX_EVENTS, type SyncEvent } from '@fitness/contract';
import { liveQuery } from 'dexie';

import { type Auth, type AuthState } from '@/auth/auth';
import type { db as appDb, OutboxEvent } from '@/db/db';
import { ApiError } from '@/lib/errors';

/** Có mạng trở lại (sự kiện `online` của trình duyệt). */
function onBrowserOnline(listener: () => void): () => void {
  window.addEventListener('online', listener);
  return () => window.removeEventListener('online', listener);
}

/** User quay lại app (`visibilitychange` sang hiện). */
function onBrowserVisible(listener: () => void): () => void {
  const onChange = () => {
    if (document.visibilityState === 'visible') listener();
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** Thử lại lần đẩy lỗi thứ `attempt` (từ 0) sau: 5s, 10s, 20s… tối đa 5 phút. */
function defaultRetryDelayMs(attempt: number): number {
  return Math.min(5000 * 2 ** attempt, 5 * 60_000);
}

/** Phiên đã xác nhận: gọi được API thay chủ máy (ở `reauth-needed` thì ngừng đẩy). */
function canFetch(state: AuthState): boolean {
  return state.status === 'signed-in' && !state.sessionPending;
}

function toSyncEvent(event: OutboxEvent): SyncEvent {
  return {
    entity: event.entity,
    op: event.op,
    payload: event.payload,
  } as SyncEvent;
}

/**
 * Bộ đẩy outbox (SDD 3.2, UC07 bước 4, UC10): đẩy các sự kiện theo thứ tự `seq`, từng batch,
 * và chỉ xoá sự kiện sau khi server xác nhận. Lỗi (mất mạng, server lỗi) thì giữ nguyên
 * outbox, không bỏ qua sự kiện nào, và thử lại sau (backoff), khi có mạng lại, khi quay lại
 * app hoặc lần ghi tiếp theo. Đẩy sau mỗi lần ghi (outbox đổi, kể cả từ tab khác), khi
 * `online`, khi `visibilitychange` sang hiện và khi phiên được xác nhận (mở app, đăng nhập
 * lại). Không dùng Background Sync.
 *
 * TODO(sync): hai tab có thể cùng đẩy một batch. Server upsert idempotent nên không trùng,
 * nhưng bản cũ tới sau có thể ghi đè bản mới; chấp nhận vì một user thường chỉ mở một tab.
 */
export function createOutboxPush(deps: {
  db: typeof appDb;
  auth: Auth;
  /** POST /v1/sync/push. */
  pushEvents: (events: SyncEvent[]) => Promise<unknown>;
  onReconnect?: (listener: () => void) => () => void;
  onVisible?: (listener: () => void) => () => void;
  /** Chờ bao lâu rồi thử lại lần đẩy lỗi thứ `attempt`; `Infinity` = không tự thử lại. */
  retryDelayMs?: (attempt: number) => number;
}): { flush(): Promise<void>; stop(): void } {
  const { db, auth } = deps;
  const retryDelayMs = deps.retryDelayMs ?? defaultRetryDelayMs;

  let stopped = false;
  /** Lần đẩy đang chạy; trong lúc đó có yêu cầu mới thì `again` để chạy thêm một vòng. */
  let running: Promise<void> | undefined;
  let again = false;
  let retryAttempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function cancelRetry() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function scheduleRetry() {
    cancelRetry();
    const delay = retryDelayMs(retryAttempt++);
    if (Number.isFinite(delay)) {
      retryTimer = setTimeout(() => void flush(), delay);
    }
  }

  /** Đẩy tới khi outbox rỗng, lỗi, hoặc phiên không còn dùng được. */
  async function drain() {
    while (!stopped && canFetch(auth.getState())) {
      const batch = await db.outbox
        .orderBy('seq')
        .limit(SYNC_PUSH_MAX_EVENTS)
        .toArray();
      if (batch.length === 0) {
        retryAttempt = 0;
        return;
      }
      try {
        await deps.pushEvents(batch.map(toSyncEvent));
      } catch (error) {
        if (!(error instanceof ApiError)) {
          console.error('Không đẩy được outbox', error);
        }
        scheduleRetry();
        return;
      }
      retryAttempt = 0;
      cancelRetry();
      // Sự kiện không bao giờ bị sửa (thay đổi mới là sự kiện mới), nên xoá đúng các `seq`
      // vừa gửi là an toàn kể cả khi có ghi mới trong lúc đẩy.
      await db.outbox.bulkDelete(batch.map((event) => event.seq));
    }
  }

  function flush(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (running) {
      again = true;
      return running;
    }
    const done = drain()
      .catch((error: unknown) => {
        // IndexedDB lỗi: outbox còn nguyên, lần sau thử lại.
        console.error('Không đọc được outbox', error);
        scheduleRetry();
      })
      .finally(() => {
        running = undefined;
        if (again) {
          again = false;
          void flush();
        }
      });
    running = done;
    return done;
  }

  const subscription = liveQuery(() => db.outbox.count()).subscribe({
    next: (count) => {
      if (count > 0) void flush();
    },
    error: (error: unknown) =>
      console.error('Không theo dõi được outbox', error),
  });
  let ready = canFetch(auth.getState());
  const unsubscribeAuth = auth.subscribe(() => {
    const next = canFetch(auth.getState());
    if (next && !ready) void flush();
    ready = next;
  });
  const offReconnect = (deps.onReconnect ?? onBrowserOnline)(
    () => void flush(),
  );
  const offVisible = (deps.onVisible ?? onBrowserVisible)(() => void flush());
  void flush();

  return {
    flush,
    stop() {
      stopped = true;
      cancelRetry();
      subscription.unsubscribe();
      unsubscribeAuth();
      offReconnect();
      offVisible();
    },
  };
}
