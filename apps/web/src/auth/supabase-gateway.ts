import {
  isAuthApiError,
  isAuthRefreshDiscardedError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';

import {
  AuthFailure,
  type AuthFailureCode,
  type AuthGateway,
  type AuthUser,
  type SessionLookup,
} from './gateway';

function toUser(session: Session): AuthUser {
  const { user } = session;
  return {
    id: user.id,
    email: user.email ?? '',
    provider: (user.app_metadata.provider as string | undefined) ?? 'email',
  };
}

const API_CODES: Partial<Record<string, AuthFailureCode>> = {
  invalid_credentials: 'invalid_credentials',
  user_already_exists: 'user_already_exists',
  email_exists: 'user_already_exists',
  weak_password: 'weak_password',
  email_not_confirmed: 'email_not_confirmed',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
};

/** Lỗi của supabase-js → `AuthFailure` mang mã UI dịch được. */
export function toAuthFailure(error: unknown): AuthFailure {
  if (isAuthRetryableFetchError(error)) return new AuthFailure('network');
  if (isAuthWeakPasswordError(error)) return new AuthFailure('weak_password');
  if (isAuthApiError(error)) {
    if (error.status === 429) return new AuthFailure('rate_limited');
    return new AuthFailure((error.code && API_CODES[error.code]) || 'unknown');
  }
  // fetch ném TypeError khi không tới được server.
  if (error instanceof TypeError) return new AuthFailure('network');
  return new AuthFailure('unknown');
}

/** `AuthGateway` bằng supabase-js (SDD 9.1). */
export function createSupabaseGateway(
  getClient: () => SupabaseClient,
): AuthGateway {
  return {
    async getSession(): Promise<SessionLookup> {
      let client: SupabaseClient;
      try {
        client = getClient();
      } catch {
        // Chưa cấu hình Supabase: app vẫn mở được, lỗi rõ ràng hiện khi bấm đăng nhập.
        return { kind: 'none' };
      }
      const { data, error } = await client.auth.getSession();
      if (data.session) return { kind: 'session', user: toUser(data.session) };
      // Token hết hạn, refresh thất bại vì mạng: phiên vẫn nằm trong localStorage.
      if (isAuthRetryableFetchError(error)) return { kind: 'unreachable' };
      return { kind: 'none' };
    },
    async signIn(email, password) {
      const { data, error } = await getClient()
        .auth.signInWithPassword({ email, password })
        .catch((e: unknown) => ({ data: { session: null }, error: e }));
      if (error || !data.session) throw toAuthFailure(error);
      return toUser(data.session);
    },
    async signUp(email, password) {
      const { data, error } = await getClient()
        .auth.signUp({ email, password })
        .catch((e: unknown) => ({ data: { session: null }, error: e }));
      if (error) throw toAuthFailure(error);
      return data.session ? toUser(data.session) : null;
    },
    async refreshSession() {
      const { data, error } = await getClient()
        .auth.refreshSession()
        .catch((e: unknown) => ({ data: { session: null }, error: e }));
      // Commit guard của supabase-js: lần refresh khác (vd tab khác) đã ghi token mới, phiên
      // vẫn sống.
      if (data.session || isAuthRefreshDiscardedError(error))
        return 'refreshed';
      // Chỉ coi là phiên chết khi máy không còn phiên, hoặc server từ chối refresh token
      // (4xx, trừ 429). Lỗi khác (mạng, 5xx, giới hạn tần suất, lỗi lạ) là tạm thời: giữ
      // phiên, thử lại sau (SDD 9.1).
      if (isAuthSessionMissingError(error)) return 'rejected';
      if (
        isAuthApiError(error) &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        return 'rejected';
      }
      return 'unreachable';
    },
    async signOut() {
      // scope 'local': chỉ máy này; supabase-js xoá phiên trên máy kể cả khi lỗi mạng,
      // `error` chỉ là lỗi báo server thu hồi refresh token nên bỏ qua.
      await getClient()
        .auth.signOut({ scope: 'local' })
        .catch(() => {});
    },
    onSessionChange(listener) {
      let client: SupabaseClient;
      try {
        client = getClient();
      } catch {
        return () => {};
      }
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Callback chạy trong lock của supabase-js: gọi lại supabase-js ngay ở đây sẽ
        // deadlock, nên báo listener sau.
        if (event === 'SIGNED_OUT') setTimeout(() => listener(null), 0);
        else if (
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          session
        ) {
          const user = toUser(session);
          setTimeout(() => listener(user), 0);
        }
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
