import type { db as appDb } from '@/db/db';
import { ApiError } from '@/lib/errors';

import {
  AuthFailure,
  type AuthGateway,
  type AuthUser,
  type SessionLookup,
} from './gateway';

/**
 * Trạng thái đăng nhập của máy (GLOSSARY.md › Tài khoản & phiên):
 * - `signed-out`: máy chưa có chủ. `afterSignOut`: vừa đăng xuất chủ động (màn đăng nhập
 *   không nhớ trang cũ, vì người đăng nhập tiếp theo có thể là người khác).
 * - `signed-in`: có phiên (kể cả khi đang offline chưa refresh được token).
 *   `sessionPending`: mở app với chủ máy, chưa xác nhận được phiên (đang đọc/refresh token,
 *   hoặc offline chưa refresh được); có thể hoá ra `reauth-needed`, nên màn đăng nhập
 *   chưa tự chuyển đi.
 * - `reauth-needed`: máy có chủ nhưng mất phiên; app vẫn dùng được, chỉ ngừng đồng bộ.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out'; afterSignOut?: true }
  | { status: 'signed-in'; user: AuthUser; sessionPending?: true }
  | { status: 'reauth-needed'; user: AuthUser };

/** Chủ máy của trạng thái này (`undefined` khi máy chưa có chủ). */
export function ownerOf(state: AuthState): AuthUser | undefined {
  return 'user' in state ? state.user : undefined;
}

export interface Auth {
  /**
   * Xong khi đã biết trạng thái để chọn màn hình. Máy có chủ: chỉ đọc IndexedDB rồi vào app
   * ngay (ADR 0001), phiên được đọc ở nền; máy chưa có chủ: chờ đọc phiên. Lần trước lỗi
   * (vd IndexedDB không mở được) thì gọi lại sẽ đọc lại.
   */
  ready(): Promise<void>;
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

/** Thử lại GET /me lần thứ `attempt` (từ 0) sau: 5s, 10s, 20s… tối đa 5 phút. */
function defaultRetryDelayMs(attempt: number): number {
  return Math.min(5000 * 2 ** attempt, 5 * 60_000);
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function createAuth(deps: {
  gateway: AuthGateway;
  db: typeof appDb;
  /** GET /me. */
  fetchMe: () => Promise<unknown>;
  /** Nhận kết quả GET /me của phiên hiện tại (vd để cache); kết quả của phiên cũ bị bỏ. */
  onMe?: (me: unknown) => void;
  clearCaches: () => void;
  onReconnect?: (listener: () => void) => () => void;
  /** Chờ bao lâu rồi thử lại GET /me lỗi lần thứ `attempt`; `Infinity` = không tự thử lại. */
  retryDelayMs?: (attempt: number) => number;
}): Auth {
  const { gateway, db } = deps;
  const retryDelayMs = deps.retryDelayMs ?? defaultRetryDelayMs;
  let state: AuthState = { status: 'loading' };
  const listeners = new Set<() => void>();

  /**
   * Tăng mỗi lần đổi trạng thái: việc bất đồng bộ bắt đầu từ trạng thái cũ (vd GET /me)
   * so `epoch` để không ghi đè trạng thái mới.
   */
  let epoch = 0;

  /** Bỏ mọi việc đang dở của trạng thái hiện tại (GET /me đang chạy, hẹn giờ thử lại). */
  function abandonPending() {
    epoch++;
    cancelRetry();
    provisioning = false;
  }

  function setState(next: AuthState) {
    abandonPending();
    state = next;
    listeners.forEach((listener) => listener());
  }

  /**
   * Các thao tác đổi chủ máy/trạng thái trong tab này chạy lần lượt, để hai lần
   * `becomeOwner` (vd đăng nhập và sự kiện phiên) không xen nhau.
   */
  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }

  async function readOwner(): Promise<AuthUser | undefined> {
    const entry = await db.meta.get(OWNER_KEY);
    return entry?.value as AuthUser | undefined;
  }

  /** Xoá mọi bảng IndexedDB (kể cả chủ máy); gọi trong transaction trên `db.tables`. */
  function clearTables() {
    return Promise.all(db.tables.map((table) => table.clear()));
  }

  /** Xoá mọi dữ liệu của chủ máy trên máy này: IndexedDB (kể cả chủ máy) và cache. */
  async function clearLocalData() {
    await db.transaction('rw', db.tables, clearTables);
    deps.clearCaches();
  }

  /**
   * `user` (vừa có phiên) trở thành chủ máy. Máy đang thuộc user khác thì xoá dữ liệu
   * cũ; còn thay đổi chưa đồng bộ thì bỏ phiên của `user` và từ chối, để không mất dữ
   * liệu cũng không để `user` thấy dữ liệu của chủ cũ (ADR 0001). Đọc chủ máy, đếm
   * outbox, xoá và ghi chủ máy mới trong một transaction.
   * TODO(outbox): thay việc từ chối bằng cảnh báo có lựa chọn "Xoá và tiếp tục".
   */
  async function becomeOwner(user: AuthUser) {
    type Outcome =
      | { kind: 'rejected'; owner: AuthUser }
      | { kind: 'owned'; cleared: boolean };
    const outcome = await db.transaction(
      'rw',
      db.tables,
      async (): Promise<Outcome> => {
        const owner = await readOwner();
        let cleared = false;
        if (owner && owner.id !== user.id) {
          if ((await db.outbox.count()) > 0) return { kind: 'rejected', owner };
          await clearTables();
          cleared = true;
        }
        await db.meta.put({ key: OWNER_KEY, value: user });
        return { kind: 'owned', cleared };
      },
    );
    if (outcome.kind === 'rejected') {
      await gateway.signOut();
      throw new AuthFailure('owner_has_unsynced', {
        ownerEmail: outcome.owner.email,
      });
    }
    // Chủ máy đổi: cache còn dữ liệu của user cũ.
    const current = ownerOf(state);
    if (outcome.cleared || (current && current.id !== user.id)) {
      deps.clearCaches();
    }
  }

  /**
   * `becomeOwner` cho phiên vừa đăng nhập/đăng ký. Lỗi khác `AuthFailure` (vd IndexedDB
   * bị chặn, hết quota) thì bỏ phiên vừa có: để lại thì lần mở sau lại tự vào app, khác
   * với lỗi vừa báo cho user.
   */
  async function ownNewSession(user: AuthUser) {
    try {
      await becomeOwner(user);
    } catch (error) {
      if (!(error instanceof AuthFailure)) await gateway.signOut();
      throw error;
    }
  }

  /** Server đã nhận user của phiên hiện tại (GET /me thành công). */
  let provisioned = false;
  /** GET /me đang chạy: lần gọi khác (có mạng lại, hẹn giờ, refresh token) bỏ qua. */
  let provisioning = false;
  let retryAttempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function cancelRetry() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  /**
   * GET /me; 401 thì refresh token rồi thử lại một lần. Máy tưởng token còn hạn nhưng
   * server không nhận (đồng hồ máy lệch, token hết hạn giữa chừng) thì refresh là đủ, không
   * phải mất phiên.
   */
  async function fetchMeRefreshingOnce(): Promise<unknown> {
    try {
      return await deps.fetchMe();
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      const refreshed = await gateway.refreshSession();
      if (refreshed === 'unreachable') throw new ApiError('network', 0);
      if (refreshed === 'rejected') throw error;
      return await deps.fetchMe();
    }
  }

  /**
   * Gọi GET /me để server tạo bản ghi USERS lần đầu (UC01 bước 3). Không chặn vào app:
   * lỗi mạng/server thì thử lại sau (backoff), khi có mạng trở lại hoặc khi refresh được
   * token. Vẫn 401 sau khi refresh nghĩa là server không nhận phiên này nữa: xử lý như mất
   * phiên. Kết quả về khi trạng thái đã đổi (đăng xuất, đổi user) bị bỏ.
   */
  async function provision() {
    if (state.status !== 'signed-in' || provisioned || provisioning) return;
    const startedAt = epoch;
    const { user } = state;
    const current = () => epoch === startedAt;
    cancelRetry();
    provisioning = true;
    try {
      const me = await fetchMeRefreshingOnce();
      if (!current()) return;
      provisioned = true;
      deps.onMe?.(me);
    } catch (error) {
      if (!current()) return;
      if (isUnauthorized(error)) {
        await exclusive(async () => {
          if (!current()) return;
          await gateway.signOut();
          setState({ status: 'reauth-needed', user });
        });
        return;
      }
      const delay = retryDelayMs(retryAttempt++);
      if (Number.isFinite(delay)) {
        retryTimer = setTimeout(() => void provision(), delay);
      }
    } finally {
      // Trạng thái đã đổi thì `abandonPending` đã đặt lại cờ này.
      if (current()) provisioning = false;
    }
  }

  /** Vào app với phiên (đã xác nhận) của `user`. */
  function enter(user: AuthUser) {
    setState({ status: 'signed-in', user });
    provisioned = false;
    retryAttempt = 0;
    void provision();
  }

  /**
   * Có phiên của `user` (lúc mở app, hoặc do supabase-js báo): `user` thành chủ máy rồi vào
   * app. Phiên bị từ chối (chủ máy còn thay đổi chưa đồng bộ) thì đã bị bỏ, app ở lại với
   * chủ máy cũ.
   */
  async function adopt(user: AuthUser) {
    try {
      await becomeOwner(user);
      enter(user);
    } catch (error) {
      if (!(error instanceof AuthFailure)) throw error;
      await fallBackToOwner();
    }
  }

  /**
   * Không có phiên dùng được: ở lại với chủ máy (reauth-needed), hoặc máy chưa có chủ.
   * Tab này đang có chủ mà máy hết chủ (tab khác đã đăng xuất và xoá IndexedDB): cache của
   * tab này còn dữ liệu chủ cũ, bỏ luôn.
   */
  async function fallBackToOwner() {
    const owner = await readOwner();
    if (!owner && ownerOf(state)) deps.clearCaches();
    setState(
      owner
        ? { status: 'reauth-needed', user: owner }
        : { status: 'signed-out' },
    );
  }

  /** Có phiên dùng được của `user`: đang ở đúng user đó thì chỉ cần gọi /me nếu chưa gọi. */
  async function onSession(user: AuthUser) {
    if (state.status === 'signed-in' && state.user.id === user.id) {
      if (state.sessionPending) setState({ status: 'signed-in', user });
      void provision();
    } else {
      await adopt(user);
    }
  }

  /** Áp kết quả đọc phiên lúc mở app; `owner`: chủ máy đọc được lúc đó. */
  async function applyLookup(
    lookup: SessionLookup,
    owner: AuthUser | undefined,
  ) {
    if (lookup.kind === 'session') {
      await onSession(lookup.user);
    } else if (!owner) {
      setState({ status: 'signed-out' });
    } else if (lookup.kind === 'none') {
      setState({ status: 'reauth-needed', user: owner });
    }
    // `unreachable`: mất mạng chứ không mất phiên; ở lại `signed-in` (`sessionPending`).
    // supabase-js tự refresh khi có mạng rồi báo TOKEN_REFRESHED (onSessionChange gọi /me).
  }

  /**
   * supabase-js báo phiên đổi (kể cả do tab khác). Sự kiện có thể tới muộn (vd SIGNED_IN
   * của lần đăng nhập mà user vừa đăng xuất), nên khi có phiên thì đọc lại phiên đang lưu.
   */
  function onSessionChange(changedTo: AuthUser | null) {
    exclusive(async () => {
      if (!changedTo) {
        // Phiên mất mà user không chọn: giữ chủ máy và dữ liệu, chỉ chờ đăng nhập lại. Ở
        // `signed-out`/`loading`, thao tác vừa bỏ phiên đã tự đặt trạng thái.
        if (ownerOf(state)) await fallBackToOwner();
        return;
      }
      // Vừa refresh được token thì có thể giờ mới gọi được /me.
      const lookup = await gateway.getSession();
      if (lookup.kind === 'session') await onSession(lookup.user);
    }).catch((error: unknown) => {
      console.error('Không xử lý được thay đổi phiên', error);
      // Không đọc được chủ máy lúc mất phiên: vẫn phải thôi `signed-in` để user được nhắc
      // đăng nhập lại, thay vì ở lại với phiên đã mất.
      if (!changedTo && state.status === 'signed-in') {
        setState({ status: 'reauth-needed', user: state.user });
      }
    });
  }

  let subscribed = false;

  async function init() {
    if (!subscribed) {
      subscribed = true;
      gateway.onSessionChange(onSessionChange);
      // Qua hàng đợi: không chen vào giữa lúc đăng xuất (đã xoá cache, chưa đổi trạng thái).
      (deps.onReconnect ?? onBrowserOnline)(
        () => void exclusive(async () => void provision()),
      );
    }
    const owner = await readOwner();
    if (!owner) {
      // Máy chưa có chủ: chưa có gì để dùng offline, chờ đọc phiên (vd vừa về từ OAuth).
      await applyLookup(await gateway.getSession(), owner);
      return;
    }
    // ADR 0001: máy có chủ thì vào app ngay, không chờ mạng (đọc phiên có thể phải refresh
    // token, mất mạng thì supabase-js thử lại tới ~30 giây). Phiên được đọc ở nền.
    setState({ status: 'signed-in', user: owner, sessionPending: true });
    const startedAt = epoch;
    void gateway
      .getSession()
      .then((lookup) =>
        exclusive(async () => {
          if (epoch === startedAt) await applyLookup(lookup, owner);
        }),
      )
      .catch((error: unknown) => {
        console.error('Không đọc được phiên', error);
      });
  }

  /** Lần `init` đang chạy hoặc đã xong; lỗi thì bỏ để lần gọi `ready()` sau chạy lại. */
  let initialized: Promise<void> | undefined;
  function ready(): Promise<void> {
    if (!initialized) {
      const attempt = exclusive(init);
      initialized = attempt;
      attempt.catch(() => {
        if (initialized === attempt) initialized = undefined;
      });
    }
    return initialized;
  }
  void ready(); // Đọc ngay khi tạo, không chờ route đầu tiên.

  return {
    ready,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    signIn: (email, password) =>
      exclusive(async () => {
        const user = await gateway.signIn(email, password);
        await ownNewSession(user);
        enter(user);
      }),
    signUp: (email, password) =>
      exclusive(async () => {
        const user = await gateway.signUp(email, password);
        if (!user) return 'confirm-email' as const;
        await ownNewSession(user);
        enter(user);
        return 'signed-in' as const;
      }),
    signOut: () =>
      exclusive(async () => {
        // GET /me đang dở về sau khi đã xoá cache thì không được ghi lại dữ liệu cũ.
        abandonPending();
        try {
          // Xoá dữ liệu trước: lỗi ở đây thì chưa gì thay đổi, user thử lại được.
          await clearLocalData();
        } catch (error) {
          void provision(); // Vẫn đăng nhập: chạy lại GET /me vừa bị bỏ (nếu chưa xong).
          throw error;
        }
        try {
          await gateway.signOut();
        } finally {
          setState({ status: 'signed-out', afterSignOut: true });
        }
      }),
  };
}
