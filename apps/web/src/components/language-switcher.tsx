import { Segmented } from '@/components/controls';
import {
  getLocale,
  type Locale,
  LOCALE_NAMES,
  locales,
  setLocale,
} from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

/**
 * Chọn ngôn ngữ giao diện (D27, SDD 3.5). Đổi ngôn ngữ thì app tải lại (hành vi mặc định
 * của Paraglide); phiên tập dở vẫn nằm trong IndexedDB. Đồng bộ lên `USERS.locale`
 * làm cùng màn Me khi có API cập nhật hồ sơ.
 */
export function LanguageSwitcher() {
  return (
    <Segmented<Locale>
      aria-label={m.me_language()}
      value={getLocale()}
      onValueChange={(locale) => void setLocale(locale)}
      options={locales.map((locale) => ({
        value: locale,
        label: <span lang={locale}>{LOCALE_NAMES[locale]}</span>,
      }))}
    />
  );
}
