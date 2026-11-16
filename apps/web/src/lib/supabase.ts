import { createClient } from '@supabase/supabase-js';

import { env } from './env';

/**
 * Supabase Auth phía web: phiên lưu ở localStorage (mặc định của supabase-js, SDD 9.1),
 * đăng nhập Google bằng redirect OAuth — URL redirect của từng môi trường phải khai báo trong Supabase.
 */
export const supabase = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
