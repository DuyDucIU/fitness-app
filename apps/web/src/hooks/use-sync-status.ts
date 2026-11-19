import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';

import { db } from '@/db/db';

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export interface SyncStatus {
  online: boolean;
  /** Số sự kiện outbox chưa đẩy lên server (SDD 3.2). */
  pending: number;
}

/** Trạng thái mạng và số thay đổi chưa đồng bộ, cho chip đồng bộ trên mọi màn. */
export function useSyncStatus(): SyncStatus {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);
  return { online, pending };
}
