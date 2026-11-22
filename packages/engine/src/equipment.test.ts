import { describe, expect, it } from 'vitest';
import { equipmentDefaults } from './equipment';

describe('equipmentDefaults', () => {
  it('tạ đòn: ghi tổng tạ, bậc 2,5 kg, đòn 20 kg', () => {
    // Given bài dùng tạ đòn, When lấy mặc định, Then tính cả đòn 20 kg
    expect(equipmentDefaults('barbell')).toEqual({
      stepKg: 2.5,
      loadInput: 'total',
      barWeightKg: 20,
    });
  });

  it('tạ đơn: ghi mỗi quả, không có đòn', () => {
    expect(equipmentDefaults('dumbbell')).toEqual({
      stepKg: 2,
      loadInput: 'per_dumbbell',
      barWeightKg: null,
    });
  });

  it('cáp và máy: ghi theo cột tạ, bậc 5 kg', () => {
    for (const code of ['cable', 'machine']) {
      expect(equipmentDefaults(code)).toEqual({
        stepKg: 5,
        loadInput: 'stack',
        barWeightKg: null,
      });
    }
  });

  it('chỉ thân người: ghi tạ đeo thêm', () => {
    expect(equipmentDefaults('body only')).toMatchObject({
      loadInput: 'added_weight',
      barWeightKg: null,
    });
  });

  it('dụng cụ lạ hoặc không có: ghi tổng tạ, bậc 2,5 kg, không có đòn', () => {
    const fallback = { stepKg: 2.5, loadInput: 'total', barWeightKg: null };
    expect(equipmentDefaults(null)).toEqual(fallback);
    expect(equipmentDefaults('sled')).toEqual(fallback);
    expect(equipmentDefaults('e-z curl bar')).toEqual(fallback);
    expect(equipmentDefaults('constructor')).toEqual(fallback);
  });
});
