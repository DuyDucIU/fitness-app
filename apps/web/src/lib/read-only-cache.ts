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

type Db = typeof appDb;
type Table = Db['tables'][number];

/**
 * Giữ một cache chỉ đọc trên máy (ADR 0002, SDD 3.2), vd catalog bài tập hay routine. Làm
 * mới khi phiên được xác nhận (lúc mở app, sau khi đăng nhập) và khi có mạng trở lại; gọi
 * `refresh()` sau mỗi lần ghi thành công lên server. Lỗi thì giữ cache cũ, không chặn app.
 */
export function createReadOnlyCache<T>(deps: {
  db: Db;
  auth: Auth;
  /** Tên cache trong log lỗi. */
  label: string;
  /** Bảng bị `replace` ghi (cùng transaction với việc đọc chủ máy). */
  tables: Table[];
  fetch: () => Promise<T>;
  /** Thay toàn bộ nội dung cache bằng dữ liệu mới (chạy trong transaction). */
  replace: (data: T) => Promise<void>;
  onReconnect?: (listener: () => void) => () => void;
}): { refresh(): Promise<void> } {
  const { db, auth } = deps;

  /** Lần làm mới đang chạy, theo chủ máy lúc bắt đầu. */
  let inflight: { ownerId: string; again: boolean; done: Promise<void> } | undefined;

  /**
   * Thay cache trong cùng transaction với việc đọc chủ máy: dữ liệu về muộn sau khi đăng
   * xuất hay đổi chủ máy thì bỏ, để dữ liệu của user cũ không lọt vào máy của user khác.
   */
  async function store(owner: AuthUser, data: T) {
    await db.transaction('rw', [db.meta, ...deps.tables], async () => {
      const current = (await db.meta.get(OWNER_KEY))?.value as
        | AuthUser
        | undefined;
      if (current?.id !== owner.id) return;
      await deps.replace(data);
    });
  }

  async function run(owner: AuthUser) {
    try {
      await store(owner, await deps.fetch());
    } catch (error) {
      // Mất mạng, server lỗi, mất phiên: dùng tiếp cache đang có, lần sau làm mới lại.
      if (!(error instanceof ApiError)) {
        console.error(`Không làm mới được ${deps.label}`, error);
      }
    }
  }

  function refresh(): Promise<void> {
    const state = auth.getState();
    const owner = ownerOf(state);
    if (!owner || !canFetch(state)) return Promise.resolve();
    if (inflight?.ownerId === owner.id) {
      // Lần đang chạy có thể đã đọc server trước một lần ghi vừa xong: chạy thêm một
      // lượt sau nó, và chỉ báo xong khi lượt đó xong.
      inflight.again = true;
      return inflight.done;
    }
    const entry = { ownerId: owner.id, again: false, done: Promise.resolve() };
    entry.done = (async () => {
      do {
        entry.again = false;
        await run(owner);
      } while (entry.again);
    })().finally(() => {
      if (inflight === entry) inflight = undefined;
    });
    inflight = entry;
    return entry.done;
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
