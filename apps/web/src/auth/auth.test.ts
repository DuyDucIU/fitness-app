import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/db';
import { ApiError } from '@/lib/errors';

import { createAuth } from './auth';
import type { SessionLookup } from './gateway';
import { AN, BINH, fakeGateway, PASSWORD } from './testing';

async function setup(
  options: {
    stored?: SessionLookup;
    fetchMe?: () => Promise<unknown>;
  } = {},
) {
  const fake = fakeGateway(options);
  const clearCaches = vi.fn();
  const auth = createAuth({
    gateway: fake.gateway,
    db,
    fetchMe: options.fetchMe ?? (async () => ({})),
    clearCaches,
  });
  await auth.ready;
  return { auth, fake, clearCaches };
}

/** Một thay đổi chưa đồng bộ trong outbox. */
async function addPendingChange() {
  await db.outbox.add({
    entity: 'set_logs',
    entityId: 'set-1',
    op: 'upsert',
    payload: {},
    createdAt: 0,
    attempts: 0,
  });
}

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

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
    const fake = fakeGateway();
    fake.gateway.signUp = async () => null;
    const auth = createAuth({
      gateway: fake.gateway,
      db,
      fetchMe: async () => ({}),
      clearCaches: vi.fn(),
    });
    await auth.ready;

    await expect(auth.signUp('chi@example.com', PASSWORD)).resolves.toBe(
      'confirm-email',
    );
    expect(auth.getState()).toEqual({ status: 'signed-out' });
  });
});

describe('tạo user trên server (GET /me)', () => {
  it('gọi /me sau khi đăng nhập', async () => {
    const fetchMe = vi.fn(async () => ({}));
    const { auth } = await setup({ fetchMe });
    await auth.signIn(AN.email, PASSWORD);
    await vi.waitFor(() => expect(fetchMe).toHaveBeenCalled());
  });

  it('server không tới được: vẫn dùng app bình thường', async () => {
    const { auth } = await setup({
      fetchMe: async () => {
        throw new ApiError('network', 0);
      },
    });
    await auth.signIn(AN.email, PASSWORD);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
  });

  it('server từ chối token (401): coi như mất phiên', async () => {
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
    expect(reopened.auth.getState()).toEqual({
      status: 'reauth-needed',
      user: BINH,
    });
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
  it('còn phiên đã lưu: signed-in', async () => {
    const { auth } = await setup({ stored: { kind: 'session', user: AN } });
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
  });

  it('phiên đã mất trong lúc app đóng: reauth-needed với chủ máy cũ', async () => {
    const first = await setup();
    await first.auth.signIn(AN.email, PASSWORD);

    const { auth } = await setup({ stored: { kind: 'none' } });
    expect(auth.getState()).toEqual({ status: 'reauth-needed', user: AN });
  });

  it('offline, token hết hạn chưa refresh được: vẫn signed-in (không coi là mất phiên)', async () => {
    const first = await setup();
    await first.auth.signIn(AN.email, PASSWORD);

    const { auth } = await setup({ stored: { kind: 'unreachable' } });
    expect(auth.getState()).toEqual({ status: 'signed-in', user: AN });
  });
});

describe('đăng xuất', () => {
  it('máy quên chủ máy và xoá dữ liệu trên máy', async () => {
    const { auth, clearCaches } = await setup();
    await auth.signIn(AN.email, PASSWORD);
    await addPendingChange();

    await auth.signOut();

    expect(auth.getState()).toEqual({ status: 'signed-out' });
    expect(await db.outbox.count()).toBe(0);
    expect(clearCaches).toHaveBeenCalled();
    // Mở lại app: vẫn là máy chưa có chủ.
    const reopened = await setup();
    expect(reopened.auth.getState()).toEqual({ status: 'signed-out' });
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
});
