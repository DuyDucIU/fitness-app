import { describe, expect, it } from 'vitest';
import { equipmentDefaults } from './equipment';

describe('equipmentDefaults', () => {
  it('Given tạ đòn, When lấy mặc định, Then ghi tổng tạ, bậc 5 kg (bánh nhỏ nhất 2,5 kg gắn hai bên), đòn 20 kg', () => {
    expect(equipmentDefaults('barbell')).toEqual({
      stepKg: 5,
      loadInput: 'total',
      barWeightKg: 20,
    });
  });

  it('Given tạ đơn, When lấy mặc định, Then ghi mỗi quả, bậc 2,5 kg, không có đòn', () => {
    expect(equipmentDefaults('dumbbell')).toEqual({
      stepKg: 2.5,
      loadInput: 'per_dumbbell',
      barWeightKg: null,
    });
  });

  it('Given kettlebell, When lấy mặc định, Then ghi mỗi quả, bậc 4 kg', () => {
    expect(equipmentDefaults('kettlebells')).toEqual({
      stepKg: 4,
      loadInput: 'per_dumbbell',
      barWeightKg: null,
    });
  });

  it('Given cáp, When lấy mặc định, Then ghi theo cột tạ, bậc 5 kg', () => {
    expect(equipmentDefaults('cable')).toEqual({
      stepKg: 5,
      loadInput: 'stack',
      barWeightKg: null,
    });
  });

  it('Given máy, When lấy mặc định, Then ghi theo cột tạ, bậc 2,5 kg (máy gắn bánh một chỗ, vd T-bar row)', () => {
    expect(equipmentDefaults('machine')).toEqual({
      stepKg: 2.5,
      loadInput: 'stack',
      barWeightKg: null,
    });
  });

  it('Given chỉ thân người, When lấy mặc định, Then ghi tạ đeo thêm, bậc 2,5 kg', () => {
    expect(equipmentDefaults('body only')).toEqual({
      stepKg: 2.5,
      loadInput: 'added_weight',
      barWeightKg: null,
    });
  });

  it('Given dụng cụ lạ hoặc không có, When lấy mặc định, Then ghi tổng tạ, bậc 2,5 kg, không có đòn', () => {
    const fallback = { stepKg: 2.5, loadInput: 'total', barWeightKg: null };
    expect(equipmentDefaults(null)).toEqual(fallback);
    expect(equipmentDefaults('sled')).toEqual(fallback);
    expect(equipmentDefaults('e-z curl bar')).toEqual(fallback);
    expect(equipmentDefaults('constructor')).toEqual(fallback);
  });
});
