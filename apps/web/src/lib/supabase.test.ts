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
});
