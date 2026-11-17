import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from './env';

let client: SupabaseClient | undefined;

/**
 * Supabase Auth phía web: phiên lưu ở localStorage (mặc định của supabase-js, SDD 9.1),
 * đăng nhập Google bằng redirect OAuth — URL redirect của từng môi trường phải khai báo trong Supabase.
 *
 * Tạo client khi cần (không tạo lúc import): thiếu biến môi trường thì chỉ các thao tác auth báo lỗi rõ,
 * thay vì cả app trắng trang vì createClient('') ném lỗi.
 */
export function getSupabase(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error(
      'Chưa cấu hình Supabase: điền VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY trong apps/web/.env',
    );
  }
  client ??= createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
