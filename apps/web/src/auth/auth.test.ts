import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/db';
import { ApiError } from '@/lib/errors';

import { createAuth } from './auth';
import {
  AN,
  BINH,
  PASSWORD,
  addPendingChange,
  clearDb,
  createTestAuth as setup,
  fakeGateway,
} from './testing';

afterEach(async () => {
  // Gỡ mock IndexedDB/console cả khi test fail giữa chừng, để không lan sang test sau.
  vi.restoreAllMocks();
  await clearDb();
});

/** Promise điều khiển được từ test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Chờ các việc bất đồng bộ đang dở (sự kiện phiên, IndexedDB) chạy xong. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const never = () => new Promise<never>(() => {});

describe('đăng nhập', () => {
  it('máy mới: chưa đăng nhập', async () => {
    const { auth } = await setup();
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });

  it('đăng nhập thành công: vào trạng thái signed-in', async () => {
    const { auth } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
  });
});

describe('đăng ký', () => {
  it('thành công: vào luôn trạng thái signed-in', async () => {
    const { auth } = await setup();
    await expect(auth.signUp('chi@example.com', PASSWORD)).resolves.toBe(
      'signed-in',
    );
    expect(auth.getState()).toMatchObject({
      status: 'signed-in',
      user: { email: 'chi@example.com' },
    });
  });

  it('project bật xác nhận email (chưa có phiên): báo cần xác nhận, vẫn chưa đăng nhập', async () => {
    const { auth } = await setup({ signUp: async () => null });

    await expect(auth.signUp('chi@example.com', PASSWORD)).resolves.toBe(
      'confirm-email',
    );
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });
});

describe('tạo user trên server (GET /me)', () => {
  it('gọi /me sau khi đăng nhập, chỉ một lần', async () => {
    const { auth, fetchMe } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    await settle();
    expect(fetchMe).toHaveBeenCalledTimes(1);
  });

  it('server không tới được: vẫn dùng app bình thường', async () => {
    const { auth } = await setup({
      fetchMe: async () => {
        throw new ApiError('network', 0);
      },
    });
    await auth.signIn(AN.email, PASSWORD);
    await settle();
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
  });

  it('mở app lúc offline: gọi /me khi có mạng trở lại', async () => {
    const { fetchMe, reconnect } = await setup({
      owner: AN,
      stored: { kind: 'unreachable' },
    });
    await settle();
    expect(fetchMe).not.toHaveBeenCalled();
    reconnect();
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));
  });

  it('mở app lúc offline: refresh được token thì gọi /me', async () => {
    const { fake, fetchMe } = await setup({
      owner: AN,
      stored: { kind: 'unreachable' },
    });
    await settle();
    fake.refreshToken(AN);
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));
  });

  it('/me lỗi mạng: thử lại khi có mạng, thành công rồi thì thôi', async () => {
    let fail = true;
    const { auth, fetchMe, reconnect } = await setup({
      fetchMe: async () => {
        if (fail) throw new ApiError('network', 0);
        return {};
      },
    });
    await auth.signIn(AN.email, PASSWORD);
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));
    fail = false;
    reconnect();
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(2));
    reconnect();
    await settle();
    expect(fetchMe).toHaveBeenCalledTimes(2);
  });

  it('server lỗi trong khi trình duyệt vẫn online: tự thử lại, thành công rồi thì thôi', async () => {
    let fail = true;
    const { auth, fetchMe } = await setup({
      retryDelayMs: () => 0,
      fetchMe: async () => {
        if (fail) {
          fail = false;
          throw new ApiError('unavailable', 503);
        }
        return {};
      },
    });
    await auth.signIn(AN.email, PASSWORD);
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(2));
    await settle();
    expect(fetchMe).toHaveBeenCalledTimes(2);
  });

  it('401 nhưng refresh token được (đồng hồ máy lệch): thử lại /me, vẫn signed-in', async () => {
    let calls = 0;
    const { auth, fake, fetchMe, onMe } = await setup({
      stored: { kind: 'session', user: AN },
      fetchMe: async () => {
        calls++;
        if (calls === 1) throw new ApiError('unauthorized', 401);
        return { id: AN.id };
      },
    });
    await vi.waitFor(() => expect(onMe).toHaveBeenCalledWith({ id: AN.id }));
    expect(fetchMe).toHaveBeenCalledTimes(2);
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
    expect(await fake.gateway.getSession()).toEqual({
      kind: 'session',
      user: AN,
    });
  });

  it('401 và refresh không tới được server: không mất phiên, thử lại sau', async () => {
    const { auth, fake, reconnect, fetchMe } = await setup({
      stored: { kind: 'session', user: AN },
      refreshSession: async () => 'unreachable',
      fetchMe: async () => {
        throw new ApiError('unauthorized', 401);
      },
    });
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));
    await settle();
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
    expect((await fake.gateway.getSession()).kind).toBe('session');
    reconnect();
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(2));
  });

  it('vẫn 401 sau khi refresh: coi như mất phiên', async () => {
    const { auth, fake } = await setup({
      stored: { kind: 'session', user: AN },
      fetchMe: async () => {
        throw new ApiError('unauthorized', 401);
      },
    });
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN }),
    );
    expect(await fake.gateway.getSession()).toEqual({ kind: 'none' });
  });

  it('401 và server từ chối refresh token: coi như mất phiên', async () => {
    const refreshSession = vi.fn(async () => 'rejected' as const);
    const { auth, fetchMe } = await setup({
      stored: { kind: 'session', user: AN },
      refreshSession,
      fetchMe: async () => {
        throw new ApiError('unauthorized', 401);
      },
    });
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN }),
    );
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMe).toHaveBeenCalledTimes(1);
  });
});

describe('kết quả /me của phiên cũ', () => {
  it('đăng xuất trong lúc /me đang chạy: kết quả thành công cũ bị bỏ', async () => {
    const me = deferred<unknown>();
    const { auth, onMe } = await setup({ fetchMe: () => me.promise });
    await auth.signIn(AN.email, PASSWORD);
    await auth.signOut();

    me.resolve({ id: AN.id });
    await settle();
    expect(onMe).not.toHaveBeenCalled();
    expect(auth.getState()).toEqual({
      status: 'signed-out',
      afterSignOut: true,
    });
  });

  it('/me về trong lúc đang bỏ phiên (dữ liệu đã xoá): kết quả cũ bị bỏ', async () => {
    const me = deferred<unknown>();
    const discarded = deferred<void>();
    const { auth, onMe } = await setup({
      fetchMe: () => me.promise,
      signOut: () => discarded.promise,
    });
    await auth.signIn(AN.email, PASSWORD);
    const signingOut = auth.signOut();
    await settle();

    me.resolve({ id: AN.id });
    await settle();
    discarded.resolve();
    await signingOut;
    expect(onMe).not.toHaveBeenCalled();
  });

  it('có mạng lại trong lúc đang bỏ phiên: không gọi lại /me cho user cũ', async () => {
    const discarded = deferred<void>();
    let online = false;
    const { auth, onMe, reconnect } = await setup({
      fetchMe: async () => {
        if (!online) throw new ApiError('network', 0);
        return { id: AN.id };
      },
      signOut: () => discarded.promise,
    });
    await auth.signIn(AN.email, PASSWORD);
    await settle();
    const signingOut = auth.signOut();
    await settle();

    online = true;
    reconnect();
    await settle();
    discarded.resolve();
    await signingOut;
    await settle();
    expect(onMe).not.toHaveBeenCalled();
  });

  it('đăng xuất trong lúc /me đang chạy: 401 cũ không đưa app về reauth-needed', async () => {
    const me = deferred<unknown>();
    const { auth } = await setup({ fetchMe: () => me.promise });
    await auth.signIn(AN.email, PASSWORD);
    await auth.signOut();

    me.reject(new ApiError('unauthorized', 401));
    await settle();
    expect(auth.getState()).toEqual({
      status: 'signed-out',
      afterSignOut: true,
    });
  });

  it('/me của phiên hiện tại thành công: đưa kết quả cho cache', async () => {
    const { auth, onMe } = await setup({
      fetchMe: async () => ({ id: AN.id }),
    });
    await auth.signIn(AN.email, PASSWORD);
    await vi.waitFor(() => expect(onMe).toHaveBeenCalledWith({ id: AN.id }));
  });
});

describe('đăng nhập lại khi máy đã có chủ', () => {
  /** AN đã đăng nhập, có dữ liệu trên máy, rồi mất phiên. */
  async function ownedByAnThenLost() {
    const ctx = await setup();
    await ctx.auth.signIn(AN.email, PASSWORD);
    await db.syncState.put({ key: 'pullCursor', value: 'an-cursor' });
    ctx.fake.revokeSession();
    await vi.waitFor(() =>
      expect(ctx.auth.getState().status).toBe('reauth-needed'),
    );
    return ctx;
  }

  it('cùng chủ máy: giữ nguyên dữ liệu trên máy', async () => {
    const { auth } = await ownedByAnThenLost();
    await addPendingChange();

    await auth.signIn(AN.email, PASSWORD);

    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
    expect(await db.outbox.count()).toBe(1);
    expect(await db.syncState.get('pullCursor')).toBeDefined();
  });

  it('user khác, dữ liệu cũ đã đồng bộ hết: xoá dữ liệu cũ, đổi chủ máy', async () => {
    const { auth, clearCaches } = await ownedByAnThenLost();

    await auth.signIn(BINH.email, PASSWORD);

    expect(auth.getState()).toEqual({ status: 'signed-in', user: BINH });
    expect(await db.syncState.get('pullCursor')).toBeUndefined();
    expect(clearCaches).toHaveBeenCalled();
    const reopened = await setup({ stored: { kind: 'none' } });
    await vi.waitFor(() =>
      expect(reopened.auth.getState()).toEqual({
        status: 'reauth-needed',
        user: BINH,
      }),
    );
  });

  it('user khác khi chủ máy còn thay đổi chưa đồng bộ: từ chối, giữ nguyên chủ máy và dữ liệu', async () => {
    const { auth, fake } = await ownedByAnThenLost();
    await addPendingChange();

    await expect(auth.signIn(BINH.email, PASSWORD)).rejects.toMatchObject({
      code: 'owner_has_unsynced',
      ownerEmail: AN.email,
    });

    expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN });
    expect(await db.outbox.count()).toBe(1);
    expect(await fake.gateway.getSession()).toEqual({ kind: 'none' });
  });
});

describe('mở lại app', () => {
  it('máy chưa có chủ, còn phiên đã lưu: signed-in và user thành chủ máy', async () => {
    const { auth } = await setup({ stored: { kind: 'session', user: AN } });
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
    expect(await db.meta.get('owner')).toMatchObject({ value: AN });
  });

  it('máy có chủ: vào app ngay, không chờ đọc phiên (có thể đang refresh token offline)', async () => {
    const getSession = vi.fn(never);
    const { auth, fetchMe } = await setup({ owner: AN, getSession });
    expect(auth.getState()).toEqual({
      status: 'signed-in',
      user: AN,
      sessionPending: true,
    });
    expect(getSession).toHaveBeenCalled();
    await settle();
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it('máy có chủ, còn phiên: xác nhận phiên, gọi /me một lần', async () => {
    const { auth, fetchMe } = await setup({
      owner: AN,
      stored: { kind: 'session', user: AN },
    });
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));
    await settle();
    expect(fetchMe).toHaveBeenCalledTimes(1);
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
  });

  it('phiên đã mất trong lúc app đóng: reauth-needed với chủ máy cũ', async () => {
    const first = await setup();
    await first.auth.signIn(AN.email, PASSWORD);

    const { auth } = await setup({ stored: { kind: 'none' } });
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN }),
    );
  });

  it('offline, token hết hạn chưa refresh được: vẫn signed-in (không coi là mất phiên)', async () => {
    const { auth, fake } = await setup({
      owner: AN,
      stored: { kind: 'unreachable' },
    });
    await settle();
    expect(auth.getState()).toMatchObject({ status: 'signed-in', user: AN });
    // Có mạng lại, refresh được: phiên đã xác nhận.
    fake.refreshToken(AN);
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'signed-in', user: AN }),
    );
  });
});

describe('mở lại app với phiên của user khác chủ máy', () => {
  it('chủ máy đã đồng bộ hết: xoá dữ liệu cũ, user của phiên thành chủ máy', async () => {
    await db.syncState.put({ key: 'pullCursor', value: 'an-cursor' });
    const { auth, clearCaches } = await setup({
      owner: AN,
      stored: { kind: 'session', user: BINH },
    });
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'signed-in', user: BINH }),
    );
    expect(await db.syncState.get('pullCursor')).toBeUndefined();
    expect(clearCaches).toHaveBeenCalled();
  });

  it('chủ máy còn thay đổi chưa đồng bộ: bỏ phiên lạ, giữ chủ máy và dữ liệu', async () => {
    await addPendingChange();
    const { auth, fake } = await setup({
      owner: AN,
      stored: { kind: 'session', user: BINH },
    });
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN }),
    );
    expect(await db.outbox.count()).toBe(1);
    expect(await fake.gateway.getSession()).toEqual({ kind: 'none' });
  });
});

describe('đăng xuất', () => {
  it('máy quên chủ máy và xoá dữ liệu trên máy', async () => {
    const { auth, clearCaches } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    await addPendingChange();

    await auth.signOut();

    expect(auth.getState()).toEqual({
      status: 'signed-out',
      afterSignOut: true,
    });
    expect(await db.outbox.count()).toBe(0);
    expect(clearCaches).toHaveBeenCalled();
    // Mở lại app: vẫn là máy chưa có chủ.
    const reopened = await setup();
    expect(reopened.auth.getState()).toEqual({ status: 'signed-out' });
  });

  it('không xoá được dữ liệu trên máy: báo lỗi, vẫn đăng nhập và giữ phiên, dữ liệu còn nguyên', async () => {
    const { auth, fake } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    await addPendingChange();
    // Mọi bảng Dexie dùng chung Table.prototype.clear.
    const clear = vi
      .spyOn(Object.getPrototypeOf(db.outbox) as typeof db.outbox, 'clear')
      .mockRejectedValue(new Error('QuotaExceededError'));

    await expect(auth.signOut()).rejects.toThrow();

    clear.mockRestore();
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
    expect(await fake.gateway.getSession()).toEqual({
      kind: 'session',
      user: AN,
    });
    expect(await db.outbox.count()).toBe(1);
  });
});

describe('mất phiên (ADR 0001)', () => {
  it('máy có chủ: chuyển sang reauth-needed và giữ dữ liệu trên máy', async () => {
    const { auth, fake, clearCaches } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    await addPendingChange();

    fake.revokeSession();
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN }),
    );
    expect(await db.outbox.count()).toBe(1);
    expect(clearCaches).not.toHaveBeenCalled();
  });

  it('không đọc được IndexedDB lúc mất phiên: vẫn chuyển sang reauth-needed', async () => {
    const { auth, fake } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const get = vi
      .spyOn(db.meta, 'get')
      .mockRejectedValue(new Error('UnknownError'));

    fake.revokeSession();
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN }),
    );

    get.mockRestore();
    error.mockRestore();
  });
});

describe('phiên đổi do supabase-js báo (vd tab khác)', () => {
  /** Tab này: AN là chủ máy nhưng mất phiên. */
  async function reauthAn() {
    const ctx = await setup({ owner: AN, stored: { kind: 'none' } });
    await vi.waitFor(() =>
      expect(ctx.auth.getState().status).toBe('reauth-needed'),
    );
    return ctx;
  }

  it('đăng nhập lại chủ máy: hết reauth-needed', async () => {
    const { auth, fake } = await reauthAn();
    fake.otherTabSignIn(AN);
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'signed-in', user: AN }),
    );
  });

  it('đăng nhập user khác: đổi sang user mới và bỏ cache cũ', async () => {
    const { auth, fake, clearCaches } = await reauthAn();
    fake.otherTabSignIn(BINH);
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'signed-in', user: BINH }),
    );
    expect(clearCaches).toHaveBeenCalled();
  });

  it('đăng nhập user khác khi chủ máy còn thay đổi chưa đồng bộ: giữ chủ máy', async () => {
    const { auth, fake } = await reauthAn();
    await addPendingChange();
    fake.otherTabSignIn(BINH);
    await settle();
    expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN });
    expect(await db.outbox.count()).toBe(1);
  });

  it('tab khác đăng xuất (đã xoá IndexedDB): về signed-out và bỏ cache của user cũ', async () => {
    const { auth, fake, clearCaches } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    await clearDb();
    fake.revokeSession();
    await vi.waitFor(() =>
      expect(auth.getState()).toEqual({ status: 'signed-out' }),
    );
    expect(clearCaches).toHaveBeenCalled();
  });

  it('lỗi IndexedDB khi xử lý sự kiện: không thành unhandled rejection', async () => {
    const { auth, fake } = await setup();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const put = vi
      .spyOn(db.meta, 'put')
      .mockRejectedValue(new Error('QuotaExceededError'));

    fake.otherTabSignIn(AN);
    await settle();

    put.mockRestore();
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });
});

describe('mở app khi không đọc được IndexedDB', () => {
  it('lần đầu lỗi: báo lỗi; gọi lại ready() thì đọc lại', async () => {
    const get = vi
      .spyOn(db.meta, 'get')
      .mockRejectedValueOnce(new Error('UnknownError'));
    const auth = createAuth({
      gateway: fakeGateway().gateway,
      db,
      fetchMe: async () => ({}),
      clearCaches: () => {},
      onReconnect: () => () => {},
      retryDelayMs: () => Infinity,
    });

    await expect(auth.ready()).rejects.toThrow('UnknownError');
    expect(auth.getState()).toEqual({ status: 'loading' });

    await auth.ready();
    get.mockRestore();
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });
});

describe('đăng nhập khi không ghi được IndexedDB', () => {
  it('báo lỗi và bỏ phiên vừa có, không để lại phiên mà app không dùng', async () => {
    const { auth, fake } = await setup();
    const put = vi
      .spyOn(db.meta, 'put')
      .mockRejectedValue(new Error('QuotaExceededError'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(auth.signIn(AN.email, PASSWORD)).rejects.toThrow(
      'QuotaExceededError',
    );
    await settle();

    put.mockRestore();
    error.mockRestore();
    expect(auth.getState()).toEqual({ status: 'signed-out' });
    expect(await fake.gateway.getSession()).toEqual({ kind: 'none' });
  });
});
