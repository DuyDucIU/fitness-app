import {
  getLocale,
  type Locale,
  locales,
  setLocale,
} from '@/paraglide/runtime.js';

/**
 * Song ngữ (D27, SDD 3.5). Message lấy qua `m` từ `@/paraglide/messages.js`;
 * file này chỉ lo ngôn ngữ hiện tại.
 */
export { getLocale, locales, setLocale, type Locale };

/** Tên ngôn ngữ viết bằng chính ngôn ngữ đó (endonym), giống nhau ở mọi giao diện. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

/** Gắn `<html lang>` theo ngôn ngữ đang dùng (đọc màn hình, chọn font, ngắt từ). */
export function applyDocumentLocale(): void {
  document.documentElement.lang = getLocale();
}
