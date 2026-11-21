/** Supabase giả và auth dựng sẵn cho test: chỉ import từ file test. */
import { vi } from 'vitest';

import { db } from '@/db/db';

import { createAuth, OWNER_KEY } from './auth';
import {
  AuthFailure,
  type AuthGateway,
  type AuthUser,
  type SessionLookup,
} from './gateway';

export const AN: AuthUser = {
  id: 'u-an',
  email: 'an@example.com',
  provider: 'email',
};
export const BINH: AuthUser = {
  id: 'u-binh',
  email: 'binh@example.com',
  provider: 'email',
};
export const PASSWORD = 'password1';

/** Tài khoản AN, BINH (mật khẩu `PASSWORD`) trong bộ nhớ; phiên lưu "trên máy" như localStorage. */
export function fakeGateway(options: { stored?: SessionLookup } = {}) {
  const accounts = new Map([AN, BINH].map((u) => [u.email, u]));
  let stored: SessionLookup = options.stored ?? { kind: 'none' };
  const listeners = new Set<(user: AuthUser | null) => void>();
  /** Như supabase-js: phiên đổi thì báo listener (bất đồng bộ). */
  const store = (next: SessionLookup) => {
    stored = next;
    const user = next.kind === 'session' ? next.user : null;
    setTimeout(() => listeners.forEach((l) => l(user)), 0);
  };
  const gateway: AuthGateway = {
    getSession: async () => stored,
    signIn: async (email, password) => {
      const user = accounts.get(email);
      if (!user || password !== PASSWORD)
        throw new AuthFailure('invalid_credentials');
      store({ kind: 'session', user });
      return user;
    },
    signUp: async (email) => {
      if (accounts.has(email)) throw new AuthFailure('user_already_exists');
      const user = { id: `u-${email}`, email, provider: 'email' };
      accounts.set(email, user);
      store({ kind: 'session', user });
      return user;
    },
    refreshSession: async () => {
      if (stored.kind === 'session') return 'refreshed';
      return stored.kind === 'none' ? 'rejected' : 'unreachable';
    },
    signOut: async () => store({ kind: 'none' }),
    onSessionChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    gateway,
    /** Supabase tự huỷ phiên (refresh token bị từ chối). */
    revokeSession: () => store({ kind: 'none' }),
    /** Tab khác của app đăng nhập `user` (supabase-js đồng bộ phiên giữa các tab). */
    otherTabSignIn: (user: AuthUser) => store({ kind: 'session', user }),
    /** Có mạng lại, supabase-js refresh được token của phiên (của `user`) đang lưu. */
    refreshToken: (user: AuthUser) => store({ kind: 'session', user }),
  };
}

/**
 * Auth thật trên Supabase giả và Dexie thật (fake-indexeddb).
 * - `owner`: máy đã có chủ từ trước khi mở app.
 * - `reconnect()`: giả lập trình duyệt có mạng trở lại.
 * - `onMe`: nhận kết quả GET /me còn hợp lệ (để cache).
 */
export async function createTestAuth(
  options: {
    stored?: SessionLookup;
    owner?: AuthUser;
    fetchMe?: () => Promise<unknown>;
    getSession?: AuthGateway['getSession'];
    signIn?: AuthGateway['signIn'];
    signUp?: AuthGateway['signUp'];
    signOut?: AuthGateway['signOut'];
    refreshSession?: AuthGateway['refreshSession'];
    retryDelayMs?: (attempt: number) => number;
  } = {},
) {
  if (options.owner) {
    await db.meta.put({ key: OWNER_KEY, value: options.owner });
  }
  const fake = fakeGateway({ stored: options.stored });
  if (options.getSession) fake.gateway.getSession = options.getSession;
  if (options.signIn) fake.gateway.signIn = options.signIn;
  if (options.signUp) fake.gateway.signUp = options.signUp;
  if (options.signOut) fake.gateway.signOut = options.signOut;
  if (options.refreshSession)
    fake.gateway.refreshSession = options.refreshSession;
  const clearCaches = vi.fn();
  const onMe = vi.fn();
  const fetchMe = vi.fn(options.fetchMe ?? (async () => ({})));
  let reconnectListener = () => {};
  const auth = createAuth({
    gateway: fake.gateway,
    db,
    fetchMe,
    onMe,
    clearCaches,
    onReconnect: (listener) => {
      reconnectListener = listener;
      return () => {};
    },
    // Mặc định không tự thử lại trong test (trừ khi test chỉ định).
    retryDelayMs: options.retryDelayMs ?? (() => Infinity),
  });
  await auth.ready();
  return {
    auth,
    fake,
    clearCaches,
    fetchMe,
    onMe,
    reconnect: () => reconnectListener(),
  };
}

/** Xoá IndexedDB giữa các test. */
export async function clearDb() {
  await Promise.all(db.tables.map((table) => table.clear()));
}

/** Một thay đổi chưa đồng bộ trong outbox. */
export async function addPendingChange() {
  await db.outbox.add({
    entity: 'set_logs',
    entityId: 'set-1',
    op: 'upsert',
    payload: {},
    createdAt: 0,
    attempts: 0,
  });
}
