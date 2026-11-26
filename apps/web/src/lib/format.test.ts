import { describe, expect, it } from 'vitest';

import {
  formatLongDate,
  formatMonthShort,
  formatMonthYear,
  formatNumber,
  fromLocalDate,
  formatShortDate,
  formatTime,
  formatWeekdayLetter,
  formatWeekdayLong,
  formatWeekdayShort,
  parseDecimal,
} from './format';

// Thứ Năm 19/11/2026, 19:05 giờ máy
const date = new Date(2026, 10, 19, 19, 5);

describe('formatNumber', () => {
  it('en dùng dấu chấm thập phân', () => {
    expect(formatNumber(77.5, {}, 'en')).toBe('77.5');
    expect(formatNumber(2.5, {}, 'en')).toBe('2.5');
  });

  it('vi dùng dấu phẩy thập phân', () => {
    expect(formatNumber(77.5, {}, 'vi')).toBe('77,5');
    expect(formatNumber(102.5, {}, 'vi')).toBe('102,5');
  });

  it('cắt theo maxFractionDigits', () => {
    expect(formatNumber(1.234, { maxFractionDigits: 1 }, 'en')).toBe('1.2');
    expect(formatNumber(80, {}, 'vi')).toBe('80');
  });

  it('nhóm hàng nghìn theo locale, tắt được cho ô nhập', () => {
    expect(formatNumber(1234.5, {}, 'en')).toBe('1,234.5');
    expect(formatNumber(1234.5, {}, 'vi')).toBe('1.234,5');
    expect(formatNumber(1234.5, { grouping: false }, 'vi')).toBe('1234,5');
    expect(parseDecimal(formatNumber(1234.5, { grouping: false }, 'vi'))).toBe(
      1234.5,
    );
    expect(parseDecimal(formatNumber(1234.5, { grouping: false }, 'en'))).toBe(
      1234.5,
    );
  });

  it('trả chuỗi rỗng cho giá trị không hữu hạn', () => {
    expect(formatNumber(Number.NaN, {}, 'en')).toBe('');
  });
});

describe('ngày giờ', () => {
  it('ngày ngắn', () => {
    expect(formatShortDate(date, 'en')).toBe('Nov 19');
    expect(formatShortDate(date, 'vi')).toBe('19/11');
  });

  it('thứ viết tắt', () => {
    expect(formatWeekdayShort(date, 'en')).toBe('Thu');
    expect(formatWeekdayShort(date, 'vi')).toBe('T5');
  });

  it('thứ một chữ trên dải tuần: en một chữ cái, vi giữ T2…CN', () => {
    expect(formatWeekdayLetter(date, 'en')).toBe('T');
    expect(formatWeekdayLetter(date, 'vi')).toBe('T5');
    expect(formatWeekdayLetter(new Date(2026, 10, 22), 'vi')).toBe('CN');
  });

  it('thứ đầy đủ', () => {
    expect(formatWeekdayLong(date, 'en')).toBe('Thursday');
    expect(formatWeekdayLong(date, 'vi')).toBe('Thứ Năm');
  });

  it('ngày dài có thứ', () => {
    expect(formatLongDate(date, 'en')).toBe('Thursday, Nov 19');
    expect(formatLongDate(date, 'vi')).toBe('Thứ Năm, 19/11');
  });

  it('giờ', () => {
    expect(formatTime(date, 'en')).toBe('7:05 PM');
    expect(formatTime(date, 'vi')).toBe('19:05');
  });
});

describe('parseDecimal', () => {
  it('nhận cả dấu phẩy lẫn dấu chấm', () => {
    expect(parseDecimal('77,5')).toBe(77.5);
    expect(parseDecimal('77.5')).toBe(77.5);
    expect(parseDecimal(' 80 ')).toBe(80);
    expect(parseDecimal(',5')).toBe(0.5);
  });

  it('từ chối giá trị không phải số', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
    expect(parseDecimal('1.000,5')).toBeNull();
  });
});

describe('tháng và ngày lịch', () => {
  it('nhãn tháng ngắn trên trục: "Nov" (en) / "T11" (vi)', () => {
    expect(formatMonthShort(date, 'en')).toBe('Nov');
    expect(formatMonthShort(date, 'vi')).toBe('T11');
  });

  it('tháng kèm năm: "Nov 2026" (en) / "Tháng 11/2026" (vi)', () => {
    expect(formatMonthYear(date, 'en')).toBe('Nov 2026');
    expect(formatMonthYear(date, 'vi')).toBe('Tháng 11/2026');
  });

  it('ngày lịch YYYY-MM-DD thành nửa đêm giờ máy, không lệch ngày', () => {
    const d = fromLocalDate('2026-11-16');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([
      2026, 10, 16, 0,
    ]);
  });
});
