import type { CatalogResponse } from '@fitness/contract';

import { type Auth, type AuthState, OWNER_KEY, ownerOf } from '@/auth/auth';
import type { AuthUser } from '@/auth/gateway';
import type { db as appDb } from '@/db/db';
import { ApiError } from '@/lib/errors';

/** Có mạng trở lại (sự kiện `online` của trình duyệt). */
function onBrowserOnline(listener: () => void): () => void {
  window.addEventListener('online', listener);
  return () => window.removeEventListener('online', listener);
}

/** Phiên đã xác nhận: gọi được API thay chủ máy. */
function canFetch(state: AuthState): boolean {
  return state.status === 'signed-in' && !state.sessionPending;
}

/**
 * Giữ cache chỉ đọc của catalog bài tập trên máy (ADR 0002, SDD 3.2). Làm mới khi phiên
 * được xác nhận (lúc mở app, sau khi đăng nhập) và khi có mạng trở lại; gọi `refresh()`
 * sau mỗi lần ghi thành công lên server (vd tạo bài tuỳ chỉnh). Lỗi thì giữ cache cũ,
 * không chặn app.
 */
export function createCatalogSync(deps: {
  db: typeof appDb;
  auth: Auth;
  /** GET /v1/catalog. */
  fetchCatalog: () => Promise<CatalogResponse>;
  onReconnect?: (listener: () => void) => () => void;
}): { refresh(): Promise<void> } {
  const { db, auth } = deps;

  /** Lần làm mới đang chạy, theo chủ máy lúc bắt đầu. */
  let inflight: { ownerId: string; done: Promise<void> } | undefined;

  /**
   * Thay toàn bộ cache, trong cùng transaction với việc đọc chủ máy: catalog về muộn sau
   * khi đăng xuất hay đổi chủ máy thì bỏ, để alias và bài tuỳ chỉnh của user cũ không lọt
   * vào máy của user khác.
   */
  async function replace(owner: AuthUser, catalog: CatalogResponse) {
    await db.transaction('rw', db.exercises, db.meta, async () => {
      const current = (await db.meta.get(OWNER_KEY))?.value as
        AuthUser | undefined;
      if (current?.id !== owner.id) return;
      await db.exercises.clear();
      await db.exercises.bulkPut(catalog.exercises);
    });
  }

  async function run(owner: AuthUser) {
    try {
      await replace(owner, await deps.fetchCatalog());
    } catch (error) {
      // Mất mạng, server lỗi, mất phiên: dùng tiếp cache đang có, lần sau làm mới lại.
      if (!(error instanceof ApiError)) {
        console.error('Không làm mới được catalog bài tập', error);
      }
    }
  }

  function refresh(): Promise<void> {
    const state = auth.getState();
    const owner = ownerOf(state);
    if (!owner || !canFetch(state)) return Promise.resolve();
    if (inflight?.ownerId === owner.id) return inflight.done;
    const done = run(owner).finally(() => {
      if (inflight?.done === done) inflight = undefined;
    });
    inflight = { ownerId: owner.id, done };
    return done;
  }

  /** User có phiên đã xác nhận (`undefined` khi chưa gọi API được). */
  const readyUser = () => {
    const state = auth.getState();
    return canFetch(state) ? ownerOf(state)?.id : undefined;
  };
  let ready = readyUser();
  auth.subscribe(() => {
    const next = readyUser();
    if (next && next !== ready) void refresh();
    ready = next;
  });
  (deps.onReconnect ?? onBrowserOnline)(() => void refresh());
  if (ready) void refresh();

  return { refresh };
}
