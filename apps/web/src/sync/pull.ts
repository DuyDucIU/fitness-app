import type {
  SyncEntity,
  SyncEvent,
  SyncPullResponse,
} from '@fitness/contract';
import type { EntityTable } from 'dexie';

import { type Auth, type AuthState, OWNER_KEY, ownerOf } from '@/auth/auth';
import type { AuthUser } from '@/auth/gateway';
import type { db as appDb } from '@/db/db';
import { ApiError } from '@/lib/errors';

/** Khoá trong `syncState` của cursor GET /sync/pull. */
export const PULL_CURSOR_KEY = 'pullCursor';

/** Phiên đã xác nhận: gọi được API thay chủ máy. */
function canFetch(state: AuthState): boolean {
  return state.status === 'signed-in' && !state.sessionPending;
}

/**
 * Kéo thay đổi từ server về máy (SDD 3.2): GET /sync/pull từ cursor đã lưu, từng trang tới
 * khi hết, kể cả tombstone (lưu nguyên tombstone, màn hình lọc `deletedAt`). Gọi `pull()`
 * sau khi đẩy outbox xong (bộ đẩy gọi lúc mở app, sau khi đăng nhập, khi có mạng lại, khi
 * quay lại app và sau mỗi lần ghi), để không kéo đè lúc đang đẩy.
 *
 * Mỗi trang ghi trong một transaction cùng cursor, và:
 * - bỏ qua bản ghi có thay đổi còn trong outbox hoặc trong `syncRejects`: thay đổi trên máy
 *   chưa lên server thì không bị bản cũ trên server ghi đè (bản ghi trong outbox sẽ được
 *   kéo về lại sau khi đẩy, vì server đặt lại `updated_at`);
 * - bỏ cả trang nếu chủ máy đã đổi (đăng xuất, đổi tài khoản) trong lúc chờ server.
 *
 * Lỗi (mất mạng, server lỗi, mất phiên) thì dừng, giữ cursor; lần kích hoạt sau kéo tiếp.
 */
export function createSyncPull(deps: {
  db: typeof appDb;
  auth: Auth;
  /** GET /v1/sync/pull?since=<cursor>. */
  pullChanges: (since?: string) => Promise<SyncPullResponse>;
}): { pull(): Promise<void> } {
  const { db, auth } = deps;

  const tables: Record<SyncEntity, EntityTable<{ id: string }, 'id'>> = {
    workout_sessions: db.workoutSessions,
    session_exercises: db.sessionExercises,
    set_logs: db.setLogs,
  };

  /**
   * Ghi trang kéo từ `since`; trả về `false` (bỏ trang, dừng kéo) nếu chủ máy đã đổi hoặc
   * cursor trên máy không còn là `since` (dữ liệu trên máy đã bị xoá trong lúc chờ, vd đăng
   * xuất rồi đăng nhập lại): ghi trang giữa luồng vào đó sẽ mất các trang trước.
   *
   * TODO(sync): thay đổi trong `syncRejects` được giữ, còn cursor vẫn đi qua bản ghi đó. Khi
   * có thao tác bỏ thay đổi bị từ chối, phải kéo lại bản ghi trên server (vd xoá cursor).
   */
  function apply(
    owner: AuthUser,
    since: string | undefined,
    page: SyncPullResponse,
  ): Promise<boolean> {
    return db.transaction(
      'rw',
      [
        ...Object.values(tables),
        db.outbox,
        db.syncRejects,
        db.syncState,
        db.meta,
      ],
      async () => {
        const current = (await db.meta.get(OWNER_KEY))?.value as
          AuthUser | undefined;
        if (current?.id !== owner.id) return false;
        if ((await db.syncState.get(PULL_CURSOR_KEY))?.value !== since) {
          return false;
        }
        const rejected = new Set(
          (await db.syncRejects.toArray()).map(
            (r) => `${r.event.entity}|${r.event.entityId}`,
          ),
        );
        for (const change of page.changes) {
          if (await isLocalChange(change, rejected)) continue;
          await tables[change.entity].put(change.payload);
        }
        if (page.cursor !== null) {
          await db.syncState.put({ key: PULL_CURSOR_KEY, value: page.cursor });
        }
        return true;
      },
    );
  }

  async function isLocalChange(change: SyncEvent, rejected: Set<string>) {
    const id = change.payload.id;
    if (rejected.has(`${change.entity}|${id}`)) return true;
    const pending = await db.outbox
      .where('[entity+entityId]')
      .equals([change.entity, id])
      .count();
    return pending > 0;
  }

  async function run() {
    const owner = ownerOf(auth.getState());
    if (!owner) return;
    for (;;) {
      if (!canFetch(auth.getState())) return;
      const since = (await db.syncState.get(PULL_CURSOR_KEY))?.value;
      const page = await deps.pullChanges(since);
      if (!(await apply(owner, since, page)) || !page.hasMore) return;
    }
  }

  let running: Promise<void> | undefined;

  function pull(): Promise<void> {
    running ??= run()
      .catch((error: unknown) => {
        if (!(error instanceof ApiError)) {
          console.error('Không kéo được thay đổi từ server', error);
        }
      })
      .finally(() => {
        running = undefined;
      });
    return running;
  }

  return { pull };
}
