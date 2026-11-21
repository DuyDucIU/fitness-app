import { afterEach, describe, expect, it, vi } from 'vitest';

/** env.ts đọc import.meta.env lúc import, nên mỗi test nạp lại module sau khi stub biến. */
async function loadSupabase() {
  vi.resetModules();
  return import('./supabase');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSupabase', () => {
  it('import module không ném lỗi dù chưa cấu hình Supabase', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

    await expect(loadSupabase()).resolves.toBeDefined();
  });

  it('báo lỗi rõ khi thiếu biến môi trường', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    const { getSupabase } = await loadSupabase();

    expect(() => getSupabase()).toThrow(/VITE_SUPABASE_URL/);
  });

  it('tạo một client duy nhất khi đã cấu hình', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    const { getSupabase } = await loadSupabase();

    expect(getSupabase()).toBe(getSupabase());
  });

  it('không nhận phiên của người khác chèn vào URL (#access_token=…)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    const user = (id: string) => ({
      id,
      aud: 'authenticated',
      email: `${id}@example.com`,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    });
    const inAnHour = Math.floor(Date.now() / 1000) + 3600;
    // Máy đang có phiên của chủ máy.
    localStorage.setItem(
      'sb-example-auth-token',
      JSON.stringify({
        access_token: 'owner-access',
        refresh_token: 'owner-refresh',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: inAnHour,
        user: user('owner'),
      }),
    );
    // Server xác nhận token trong link là hợp lệ (token thật từ tài khoản kẻ gửi link).
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(user('attacker')), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );
    window.history.replaceState(
      null,
      '',
      '/#access_token=attacker-access&refresh_token=attacker-refresh&expires_in=3600&token_type=bearer',
    );
    try {
      const { getSupabase } = await loadSupabase();
      const { data } = await getSupabase().auth.getSession();

      expect(data.session?.user.id).toBe('owner');
    } finally {
      window.history.replaceState(null, '', '/');
      localStorage.clear();
      vi.unstubAllGlobals();
    }
  });
});
