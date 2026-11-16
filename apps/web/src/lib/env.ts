/**
 * Biến môi trường công khai (VITE_*) được Vite nhúng vào bundle lúc build,
 * nên KHÔNG đặt khoá bí mật ở đây. URL API cấu hình được để chạy cả 3 cách demo (SDD 4.4).
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
};
