import { describe, expect, it } from 'vitest';
import {
  BodyMetricSchema,
  CreateBodyMetricRequestSchema,
  isBodyMetricValueValid,
  UpdateBodyMetricRequestSchema,
} from './index';

const ID = '00000000-0000-4000-8000-000000000001';

describe('Chỉ số cơ thể (UC18)', () => {
  it('nhận một lần cân nặng nhập tay', () => {
    const entry = {
      id: ID,
      metric: 'weight',
      value: 72.5,
      measuredAt: '2026-11-18T00:10:00.000Z',
      source: 'manual',
      edited: false,
    };
    expect(BodyMetricSchema.parse(entry)).toEqual(entry);
  });

  it('từ chối số ngoài khoảng của từng loại chỉ số', () => {
    const create = (metric: string, value: number) =>
      CreateBodyMetricRequestSchema.safeParse({
        metric,
        value,
        measuredAt: '2026-11-18T00:10:00.000Z',
      }).success;
    expect(create('weight', 72.5)).toBe(true);
    expect(create('weight', 25)).toBe(true);
    expect(create('weight', 350)).toBe(true);
    expect(create('weight', 24.9)).toBe(false);
    expect(create('weight', 350.1)).toBe(false);
    // Vòng eo nhập nhầm bằng inch.
    expect(create('waist', 32)).toBe(false);
    expect(create('waist', 82)).toBe(true);
    // Body fat nhập dạng phân số.
    expect(create('body_fat', 0.18)).toBe(false);
    expect(create('body_fat', 18)).toBe(true);
    expect(create('body_fat', 61)).toBe(false);
  });

  it('thời điểm đo là mốc thời gian đầy đủ', () => {
    expect(
      CreateBodyMetricRequestSchema.safeParse({
        metric: 'weight',
        value: 72.5,
        measuredAt: '2026-11-18',
      }).success,
    ).toBe(false);
  });

  it('sửa chỉ đổi số hoặc thời điểm, ít nhất một trong hai', () => {
    expect(UpdateBodyMetricRequestSchema.safeParse({ value: 72 }).success).toBe(
      true,
    );
    expect(
      UpdateBodyMetricRequestSchema.safeParse({
        measuredAt: '2026-11-18T00:10:00.000Z',
      }).success,
    ).toBe(true);
    expect(UpdateBodyMetricRequestSchema.safeParse({}).success).toBe(false);
  });

  it('khoảng hợp lệ dùng chung cho cả lúc sửa (server biết loại chỉ số)', () => {
    expect(isBodyMetricValueValid('waist', 82)).toBe(true);
    expect(isBodyMetricValueValid('waist', 300)).toBe(false);
  });
});
