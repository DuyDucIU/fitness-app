import type { Auth } from '@/auth/auth';
import type { db as appDb } from '@/db/db';
import type { RoutinesApi } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { createReadOnlyCache } from '@/lib/read-only-cache';

export interface RoutineSync {
  /** Làm mới cache routine trên máy từ server (lỗi thì giữ cache cũ). */
  refresh(): Promise<void>;
  /**
   * Ghi routine lên server (cần mạng, ADR 0002) rồi làm mới cache. Offline thì ném
   * `ApiError('network')` ngay, không xếp hàng chờ.
   */
  write<T>(call: (api: RoutinesApi) => Promise<T>): Promise<T>;
}

/**
 * Routine trên máy (UC05, ADR 0002): cache chỉ đọc của GET /v1/routines, làm mới lúc mở
 * app, khi có mạng lại và sau mỗi lần ghi thành công. Chỉ module này thay bảng `routines`.
 */
export function createRoutineSync(deps: {
  db: typeof appDb;
  auth: Auth;
  api: RoutinesApi;
  onReconnect?: (listener: () => void) => () => void;
  /** Trình duyệt đang có mạng (mặc định `navigator.onLine`). */
  isOnline?: () => boolean;
}): RoutineSync {
  const { db, api } = deps;
  const isOnline = deps.isOnline ?? (() => navigator.onLine);
  const cache = createReadOnlyCache({
    db,
    auth: deps.auth,
    label: 'routine',
    tables: [db.routines],
    fetch: api.list,
    replace: async ({ routines }) => {
      await db.routines.clear();
      await db.routines.bulkPut(routines);
    },
    onReconnect: deps.onReconnect,
  });

  return {
    refresh: cache.refresh,
    async write(call) {
      if (!isOnline()) throw new ApiError('network', 0);
      const result = await call(api);
      await cache.refresh();
      return result;
    },
  };
}
