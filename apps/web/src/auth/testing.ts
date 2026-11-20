/** Supabase giả cho test: chỉ import từ file test. */
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
  const listeners = new Set<() => void>();
  const end = () => {
    stored = { kind: 'none' };
    listeners.forEach((l) => l());
  };
  const gateway: AuthGateway = {
    getSession: async () => stored,
    signIn: async (email, password) => {
      const user = accounts.get(email);
      if (!user || password !== PASSWORD)
        throw new AuthFailure('invalid_credentials');
      stored = { kind: 'session', user };
      return user;
    },
    signUp: async (email) => {
      if (accounts.has(email)) throw new AuthFailure('user_already_exists');
      const user = { id: `u-${email}`, email, provider: 'email' };
      accounts.set(email, user);
      stored = { kind: 'session', user };
      return user;
    },
    signOut: async () => end(),
    onSessionEnded: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    gateway,
    /** Supabase tự huỷ phiên (refresh token bị từ chối). */
    revokeSession: end,
  };
}
