import type { db as appDb } from '@/db/db';
import { ApiError } from '@/lib/errors';

import { AuthFailure, type AuthGateway, type AuthUser } from './gateway';

/**
 * Trạng thái đăng nhập của máy (GLOSSARY.md › Tài khoản & phiên):
 * - `signed-out`: máy chưa có chủ.
 * - `signed-in`: có phiên (kể cả khi đang offline chưa refresh được token).
 * - `reauth-needed`: máy có chủ nhưng mất phiên; app vẫn dùng được, chỉ ngừng đồng bộ.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AuthUser }
  | { status: 'reauth-needed'; user: AuthUser };

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
const OWNER_KEY = 'owner';

export function createAuth(deps: {
  gateway: AuthGateway;
  db: typeof appDb;
  fetchMe: () => Promise<unknown>;
  clearCaches: () => void;
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

  /** Đang đăng xuất chủ động: sự kiện "phiên kết thúc" khi đó không phải mất phiên. */
  let signingOut = false;

  /** Bỏ phiên vừa có trên máy mà không coi là mất phiên. */
  async function discardSession() {
    signingOut = true;
    try {
      await gateway.signOut();
    } finally {
      signingOut = false;
    }
  }

  /**
   * `user` vừa đăng nhập trở thành chủ máy. Máy đang thuộc user khác thì xoá dữ liệu
   * cũ; còn thay đổi chưa đồng bộ thì từ chối để không mất dữ liệu (ADR 0001).
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

  /**
   * Gọi GET /me để server tạo bản ghi USERS lần đầu (UC01 bước 3). Không chặn vào app:
   * lỗi mạng/server thì lần mở app sau gọi lại; riêng 401 nghĩa là server không nhận
   * phiên này nữa, xử lý như mất phiên.
   */
  async function provision(user: AuthUser) {
    try {
      await deps.fetchMe();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await discardSession();
        setState({ status: 'reauth-needed', user });
      }
    }
  }

  function enter(user: AuthUser) {
    setState({ status: 'signed-in', user });
    void provision(user);
  }

  /** Phiên mất mà user không chọn: giữ chủ máy và dữ liệu, chỉ chờ đăng nhập lại. */
  async function onSessionEnded() {
    if (signingOut) return;
    const owner = await readOwner();
    setState(
      owner
        ? { status: 'reauth-needed', user: owner }
        : { status: 'signed-out' },
    );
  }

  async function init() {
    gateway.onSessionEnded(() => void onSessionEnded());
    const [lookup, owner] = await Promise.all([
      gateway.getSession(),
      readOwner(),
    ]);
    if (lookup.kind === 'session') {
      if (!owner) await writeOwner(lookup.user);
      enter(lookup.user);
    } else if (owner) {
      // `unreachable`: mất mạng chứ không mất phiên; supabase-js refresh lại khi có mạng.
      setState({
        status: lookup.kind === 'unreachable' ? 'signed-in' : 'reauth-needed',
        user: owner,
      });
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
      signingOut = true;
      try {
        await gateway.signOut();
        await clearLocalData();
      } finally {
        signingOut = false;
      }
      setState({ status: 'signed-out' });
    },
  };
}
