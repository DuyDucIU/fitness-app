import type { Routine } from '@fitness/contract';
import { useLiveQuery } from 'dexie-react-hooks';
import * as React from 'react';

import { useToast } from '@/components/toast-context';
import { db } from '@/db/db';
import type { RoutinesApi } from '@/lib/api';
import { ApiError, errorMessage } from '@/lib/errors';
import { m } from '@/paraglide/messages.js';
import { useRoutineSync } from '@/routines/routine-context';

/**
 * Routine trên máy (cache chỉ đọc), cũ trước mới sau. `undefined` khi đang đọc IndexedDB.
 */
export function useRoutines(): Routine[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.routines.toArray()).sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      ),
    [],
  );
}

/**
 * Một routine trên máy: `undefined` khi đang đọc, `null` khi không có (đã xoá, của user
 * khác, hay cache chưa tải).
 */
export function useRoutine(id: string | undefined): Routine | null | undefined {
  return useLiveQuery(
    async () => (id ? ((await db.routines.get(id)) ?? null) : null),
    [id],
  );
}

/**
 * Ghi routine (cần mạng). Lỗi thì hiện toast: mất mạng thì báo cần có mạng, lỗi khác theo
 * mã lỗi; trả `undefined` để màn giữ nguyên giá trị đang có trong cache.
 */
export function useRoutineWrite(): <T>(
  call: (api: RoutinesApi) => Promise<T>,
) => Promise<T | undefined> {
  const sync = useRoutineSync();
  const toast = useToast();
  return React.useCallback(
    async (call) => {
      try {
        return await sync.write(call);
      } catch (error) {
        toast.show(
          error instanceof ApiError && error.code === 'network'
            ? m.routine_needs_network()
            : errorMessage(error),
        );
        return undefined;
      }
    },
    [sync, toast],
  );
}
