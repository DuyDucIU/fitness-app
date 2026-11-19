import { getLocale, type Locale } from '@/paraglide/runtime.js';

/**
 * Định dạng số và ngày theo ngôn ngữ đang dùng (SDD 3.5, DESIGN.md › The Số Theo Ngôn Ngữ Rule).
 * Mọi chỗ hiển thị số/ngày đi qua module này, không gọi `toLocaleString` rải rác.
 * Tham số `locale` chỉ để test; bình thường lấy theo ngôn ngữ hiện tại.
 */

/** Ngôn ngữ giao diện → locale của Intl. */
const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', vi: 'vi-VN' };

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberFormat(
  locale: Locale,
  maxFractionDigits: number,
  useGrouping: boolean,
) {
  const key = `n|${locale}|${maxFractionDigits}|${useGrouping}`;
  let f = cache.get(key) as Intl.NumberFormat | undefined;
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[locale], {
      maximumFractionDigits: maxFractionDigits,
      useGrouping,
    });
    cache.set(key, f);
  }
  return f;
}

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const key = `d|${locale}|${JSON.stringify(options)}`;
  let f = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) {
    f = new Intl.DateTimeFormat(INTL_LOCALE[locale], options);
    cache.set(key, f);
  }
  return f;
}

/**
 * 77.5 → "77.5" (en) / "77,5" (vi). `grouping: false` bỏ dấu nhóm hàng nghìn (1234,5 thay vì
 * 1.234,5) — dùng cho giá trị đặt vào ô nhập, vì `parseDecimal` không nhận dấu nhóm.
 */
export function formatNumber(
  value: number,
  {
    maxFractionDigits = 2,
    grouping = true,
  }: { maxFractionDigits?: number; grouping?: boolean } = {},
  locale: Locale = getLocale(),
): string {
  if (!Number.isFinite(value)) return '';
  return numberFormat(locale, maxFractionDigits, grouping).format(value);
}

/**
 * "19/11" cho tiếng Việt. Ghép từ formatToParts vì dấu ngăn ngày–tháng của ICU khác nhau
 * giữa các trình duyệt (có bản ra "19-11").
 */
function viDayMonth(date: Date): string {
  const parts = dateFormat('vi', {
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}`;
}

/** Ngày ngắn: "Nov 19" (en) / "19/11" (vi). */
export function formatShortDate(
  date: Date,
  locale: Locale = getLocale(),
): string {
  if (locale === 'vi') return viDayMonth(date);
  return dateFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

/** Ngày dài: "Thursday, Nov 19" (en) / "Thứ Năm, 19/11" (vi). */
export function formatLongDate(
  date: Date,
  locale: Locale = getLocale(),
): string {
  if (locale === 'vi') {
    const weekday = dateFormat('vi', { weekday: 'long' }).format(date);
    return `${weekday.charAt(0).toLocaleUpperCase('vi-VN')}${weekday.slice(1)}, ${viDayMonth(date)}`;
  }
  return dateFormat(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** Giờ: "7:05 PM" (en) / "19:05" (vi). */
export function formatTime(date: Date, locale: Locale = getLocale()): string {
  return dateFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    date,
  );
}

/**
 * Đọc số user gõ vào ô nhập: nhận cả dấu phẩy lẫn dấu chấm làm dấu thập phân,
 * ở cả hai ngôn ngữ ("77,5" và "77.5" đều là 77.5). Không hợp lệ hoặc rỗng → null.
 */
export function parseDecimal(input: string): number | null {
  const text = input.trim().replace(/\s+/g, '');
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}
