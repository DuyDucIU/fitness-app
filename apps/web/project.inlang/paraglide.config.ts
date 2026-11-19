import { defineConfig } from '@inlang/paraglide-js';

/**
 * Tuỳ chọn compiler Paraglide, dùng chung cho Vite plugin và lệnh `i18n:compile` (SDD 3.5).
 * Ngôn ngữ gốc và mặc định là `baseLocale` trong settings.json (hiện là `en`).
 */
export default defineConfig({
  outdir: './src/paraglide',
  emitTsDeclarations: true,
  // Lựa chọn của user lưu ở máy; chưa chọn thì dùng ngôn ngữ mặc định,
  // không tự nhận theo ngôn ngữ trình duyệt (D27).
  strategy: ['localStorage', 'baseLocale'],
});
