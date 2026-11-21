import {
  AuthApiError,
  AuthRefreshDiscardedError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createSupabaseGateway } from './supabase-gateway';
import { AN } from './testing';

const SESSION_OF_AN: Session = {
  access_token: 'access',
  refresh_token: 'refresh',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: AN.id,
    email: AN.email,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
  },
};

/** supabase-js giả: chỉ những gì gateway dùng. */
function setup(
  options: {
    refreshSession?: () => Promise<unknown>;
    signOut?: () => Promise<unknown>;
  } = {},
) {
  let emit: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void = () => {};
  const auth = {
    refreshSession: vi.fn(
      options.refreshSession ??
        (async () => ({ data: { session: SESSION_OF_AN }, error: null })),
    ),
    signOut: vi.fn(options.signOut ?? (async () => ({ error: null }))),
    onAuthStateChange: vi.fn(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        emit = callback;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    ),
  };
  const gateway = createSupabaseGateway(
    () => ({ auth }) as unknown as SupabaseClient,
  );
  return {
    gateway,
    auth,
    emit: (event: AuthChangeEvent, session: Session | null) =>
      emit(event, session),
  };
}

const failed = (error: unknown) => async () => ({
  data: { session: null },
  error,
});

describe('refresh token theo yêu cầu', () => {
  it('có token mới: refreshed', async () => {
    const { gateway } = setup();
    await expect(gateway.refreshSession()).resolves.toBe('refreshed');
  });

  it('không tới được server: unreachable (phiên vẫn còn)', async () => {
    const { gateway } = setup({
      refreshSession: failed(new AuthRetryableFetchError('Failed to fetch', 0)),
    });
    await expect(gateway.refreshSession()).resolves.toBe('unreachable');
  });

  it('server từ chối refresh token: rejected', async () => {
    const { gateway } = setup({
      refreshSession: failed(
        new AuthApiError(
          'Invalid Refresh Token',
          400,
          'refresh_token_not_found',
        ),
      ),
    });
    await expect(gateway.refreshSession()).resolves.toBe('rejected');
  });

  it('máy không còn phiên để refresh: rejected', async () => {
    const { gateway } = setup({
      refreshSession: failed(new AuthSessionMissingError()),
    });
    await expect(gateway.refreshSession()).resolves.toBe('rejected');
  });

  it('Supabase giới hạn tần suất (429): unreachable, không bỏ phiên', async () => {
    const { gateway } = setup({
      refreshSession: failed(
        new AuthApiError('Too many requests', 429, 'over_request_rate_limit'),
      ),
    });
    await expect(gateway.refreshSession()).resolves.toBe('unreachable');
  });

  it('lỗi không rõ (vd lỗi trong supabase-js): unreachable, không bỏ phiên', async () => {
    const { gateway } = setup({
      refreshSession: async () => {
        throw new Error('boom');
      },
    });
    await expect(gateway.refreshSession()).resolves.toBe('unreachable');
  });

  it('lần refresh khác đã ghi token mới (commit guard): refreshed, không mất phiên', async () => {
    const { gateway } = setup({
      refreshSession: failed(new AuthRefreshDiscardedError()),
    });
    await expect(gateway.refreshSession()).resolves.toBe('refreshed');
  });
});

describe('đăng xuất', () => {
  it('lỗi khi báo server (vd mất mạng): vẫn xong, không ném lỗi', async () => {
    const { gateway, auth } = setup({
      signOut: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await expect(gateway.signOut()).resolves.toBeUndefined();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('báo phiên đổi', () => {
  it('không gọi listener ngay trong callback (đang giữ lock của supabase-js)', async () => {
    const { gateway, emit } = setup();
    const listener = vi.fn();
    gateway.onSessionChange(listener);

    emit('SIGNED_IN', SESSION_OF_AN);
    expect(listener).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(AN));
  });

  it('đăng xuất: null; refresh token: user; sự kiện khác: bỏ qua', async () => {
    const { gateway, emit } = setup();
    const listener = vi.fn();
    gateway.onSessionChange(listener);

    emit('TOKEN_REFRESHED', SESSION_OF_AN);
    emit('SIGNED_OUT', null);
    emit('INITIAL_SESSION', SESSION_OF_AN);
    emit('USER_UPDATED', SESSION_OF_AN);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(listener.mock.calls).toEqual([[AN], [null]]);
  });
});
