import type { db as appDb } from '@/db/db';
import { ApiError } from '@/lib/errors';

import { AuthFailure, type AuthGateway, type AuthUser } from './gateway';

/**
 * Trạng thái đăng nhập của máy (GLOSSARY.md › Tài khoản & phiên):
 * - `signed-out`: máy chưa có chủ. `afterSignOut`: vừa đăng xuất chủ động (màn đăng nhập
 *   không nhớ trang cũ, vì người đăng nhập tiếp theo có thể là người khác).
 * - `signed-in`: có phiên (kể cả khi đang offline chưa refresh được token).
 * - `reauth-needed`: máy có chủ nhưng mất phiên; app vẫn dùng được, chỉ ngừng đồng bộ.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out'; afterSignOut?: true }
  | { status: 'signed-in'; user: AuthUser }
  | { status: 'reauth-needed'; user: AuthUser };

/** Chủ máy của trạng thái này (`undefined` khi máy chưa có chủ). */
export function ownerOf(state: AuthState): AuthUser | undefined {
  return 'user' in state ? state.user : undefined;
}

export interface Auth {
  /** Xong khi đã đọc phiên và chủ máy lần đầu. */
  ready: Promise<void>;
  getState(): AuthState;
  subscribe(listener: () => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** `confirm-email`: project bật xác nhận email, user phải bấm link rồi mới đăng nhập. */
  signUp(
    email: string,
    password: string,
  ): Promise<'signed-in' | 'confirm-email'>;
  /** Đăng xuất chủ động: máy quên phiên, chủ máy và dữ liệu trên máy. */
  signOut(): Promise<void>;
}

/** Khoá trong `db.meta` lưu chủ máy. */
export const OWNER_KEY = 'owner';

/** Có mạng trở lại (sự kiện `online` của trình duyệt). */
function onBrowserOnline(listener: () => void): () => void {
  window.addEventListener('online', listener);
  return () => window.removeEventListener('online', listener);
}

export function createAuth(deps: {
  gateway: AuthGateway;
  db: typeof appDb;
  /** GET /me (đã cache ở phía gọi). */
  fetchMe: () => Promise<unknown>;
  clearCaches: () => void;
  onReconnect?: (listener: () => void) => () => void;
}): Auth {
  const { gateway, db } = deps;
  let state: AuthState = { status: 'loading' };
  const listeners = new Set<() => void>();

  function setState(next: AuthState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  async function readOwner(): Promise<AuthUser | undefined> {
    const entry = await db.meta.get(OWNER_KEY);
    return entry?.value as AuthUser | undefined;
  }

  async function writeOwner(user: AuthUser) {
    await db.meta.put({ key: OWNER_KEY, value: user });
  }

  /** Xoá mọi dữ liệu của chủ máy trên máy này: IndexedDB (kể cả chủ máy) và cache. */
  async function clearLocalData() {
    await db.transaction('rw', db.tables, () =>
      Promise.all(db.tables.map((table) => table.clear())),
    );
    deps.clearCaches();
  }

  /** Đang tự bỏ phiên: sự kiện "phiên kết thúc" khi đó không phải mất phiên. */
  let discarding = false;

  /** Bỏ phiên trên máy mà không coi là mất phiên. */
  async function discardSession() {
    discarding = true;
    try {
      await gateway.signOut();
    } finally {
      discarding = false;
    }
  }

  /**
   * `user` (vừa có phiên) trở thành chủ máy. Máy đang thuộc user khác thì xoá dữ liệu
   * cũ; còn thay đổi chưa đồng bộ thì bỏ phiên của `user` và từ chối, để không mất dữ
   * liệu cũng không để `user` thấy dữ liệu của chủ cũ (ADR 0001).
   * TODO(outbox): thay việc từ chối bằng cảnh báo có lựa chọn "Xoá và tiếp tục".
   */
  async function becomeOwner(user: AuthUser) {
    const owner = await readOwner();
    if (owner && owner.id !== user.id) {
      if ((await db.outbox.count()) > 0) {
        await discardSession();
        throw new AuthFailure('owner_has_unsynced', {
          ownerEmail: owner.email,
        });
      }
      await clearLocalData();
    }
    await writeOwner(user);
  }

  /** Server đã nhận user của phiên hiện tại (GET /me thành công). */
  let provisioned = false;

  /**
   * Gọi GET /me để server tạo bản ghi USERS lần đầu (UC01 bước 3). Không chặn vào app:
   * lỗi mạng/server thì thử lại khi có mạng trở lại. Riêng 401 nghĩa là server không
   * nhận phiên này nữa: xử lý như mất phiên. (Nếu server cấu hình verify JWT sai, mọi
   * user sẽ rơi vào đây — lỗi cấu hình, chấp nhận vì dữ liệu trên máy vẫn giữ.)
   */
  async function provision(user: AuthUser) {
    try {
      await deps.fetchMe();
      provisioned = true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await discardSession();
        setState({ status: 'reauth-needed', user });
      }
    }
  }

  /** Vào app với phiên của `user`; `online = false` khi chưa refresh được token vì mất mạng. */
  function enter(user: AuthUser, options: { online?: boolean } = {}) {
    provisioned = false;
    setState({ status: 'signed-in', user });
    if (options.online !== false) void provision(user);
  }

  /** Phiên mất mà user không chọn: giữ chủ máy và dữ liệu, chỉ chờ đăng nhập lại. */
  async function onSessionEnded() {
    if (discarding) return;
    const owner = await readOwner();
    setState(
      owner
        ? { status: 'reauth-needed', user: owner }
        : { status: 'signed-out' },
    );
  }

  async function init() {
    gateway.onSessionEnded(() => void onSessionEnded());
    (deps.onReconnect ?? onBrowserOnline)(() => {
      if (state.status === 'signed-in' && !provisioned)
        void provision(state.user);
    });
    const [lookup, owner] = await Promise.all([
      gateway.getSession(),
      readOwner(),
    ]);
    if (lookup.kind === 'session') {
      try {
        await becomeOwner(lookup.user);
        enter(lookup.user);
      } catch (error) {
        // Phiên lạ trên máy còn dữ liệu chưa đồng bộ của chủ máy: phiên đã bị bỏ.
        if (!(error instanceof AuthFailure) || !owner) throw error;
        setState({ status: 'reauth-needed', user: owner });
      }
    } else if (owner) {
      // `unreachable`: mất mạng chứ không mất phiên; supabase-js refresh lại khi có mạng.
      if (lookup.kind === 'unreachable') enter(owner, { online: false });
      else setState({ status: 'reauth-needed', user: owner });
    } else {
      setState({ status: 'signed-out' });
    }
  }

  return {
    ready: init(),
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async signIn(email, password) {
      const user = await gateway.signIn(email, password);
      await becomeOwner(user);
      enter(user);
    },
    async signUp(email, password) {
      const user = await gateway.signUp(email, password);
      if (!user) return 'confirm-email';
      await becomeOwner(user);
      enter(user);
      return 'signed-in';
    },
    async signOut() {
      await discardSession();
      await clearLocalData();
      setState({ status: 'signed-out', afterSignOut: true });
    },
  };
}
