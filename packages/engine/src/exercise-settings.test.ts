import { describe, expect, it } from 'vitest';
import {
  exerciseSettings,
  hasWeightSettings,
  stepChoices,
  stepWeight,
} from './exercise-settings';

describe('exerciseSettings', () => {
  it('Given bài tạ đòn chưa chỉnh riêng, When lấy cài đặt, Then theo mặc định dụng cụ và tự chạy rest timer', () => {
    expect(exerciseSettings('barbell', null)).toEqual({
      stepKg: 5,
      loadInput: 'total',
      barWeightKg: 20,
      restAutoStart: true,
    });
  });

  it('Given user đã chỉnh riêng bài, When lấy cài đặt, Then dùng đúng dòng đã lưu thay mặc định', () => {
    expect(
      exerciseSettings('barbell', {
        stepKg: 2.5,
        loadInput: 'total',
        barWeightKg: 15,
        restAutoStart: false,
      }),
    ).toEqual({
      stepKg: 2.5,
      loadInput: 'total',
      barWeightKg: 15,
      restAutoStart: false,
    });
  });
});

describe('stepWeight', () => {
  const barbell = { stepKg: 5, loadInput: 'total' as const, barWeightKg: 20 };

  it('Given tạ đòn ghi tổng ở 60 kg, When bấm − rồi +, Then xuống 55 và lên 65 kg', () => {
    expect(stepWeight(60, -1, barbell)).toBe(55);
    expect(stepWeight(60, 1, barbell)).toBe(65);
  });

  it('Given tạ đòn ghi tổng ở đúng mức đòn, When bấm −, Then không xuống thêm (nút − tắt)', () => {
    expect(stepWeight(20, -1, barbell)).toBeNull();
  });

  it('Given đòn đổi thành 15 kg, When bấm − từ 20 kg, Then xuống tới 15 kg rồi dừng', () => {
    const bar15 = { ...barbell, barWeightKg: 15 };
    expect(stepWeight(20, -1, bar15)).toBe(15);
    expect(stepWeight(15, -1, bar15)).toBeNull();
  });

  it('Given quy ước không phải tổng tạ, When bấm − tới 0, Then sàn là 0 chứ không phải đòn', () => {
    const perSide = {
      stepKg: 5,
      loadInput: 'per_side' as const,
      barWeightKg: 20,
    };
    expect(stepWeight(5, -1, perSide)).toBe(0);
    expect(stepWeight(0, -1, perSide)).toBeNull();
  });

  it('Given mức lệch ladder (kettlebell 10 kg, bậc 4), When bấm − hay +, Then xuống 8 và lên 12 kg', () => {
    const kb = {
      stepKg: 4,
      loadInput: 'per_dumbbell' as const,
      barWeightKg: null,
    };
    expect(stepWeight(10, -1, kb)).toBe(8);
    expect(stepWeight(10, 1, kb)).toBe(12);
  });

  it('Given ô tạ trống, When bấm +, Then bắt đầu từ đòn khi ghi tổng tạ, không thì từ một bậc', () => {
    expect(stepWeight(null, 1, barbell)).toBe(20);
    expect(
      stepWeight(null, 1, {
        stepKg: 2.5,
        loadInput: 'per_dumbbell',
        barWeightKg: null,
      }),
    ).toBe(2.5);
    expect(stepWeight(null, -1, barbell)).toBeNull();
  });

  it('Given bậc lẻ 1,25 kg, When bấm + nhiều lần, Then không sinh sai số dấu phẩy động', () => {
    const s = { stepKg: 1.25, loadInput: 'stack' as const, barWeightKg: null };
    expect(stepWeight(3.75, 1, s)).toBe(5);
  });
});

describe('stepChoices', () => {
  it('Given bậc đang dùng nằm trong danh sách, When lấy các mức chọn, Then đúng danh sách chung', () => {
    expect(stepChoices(2.5)).toEqual([0.5, 1, 1.25, 2, 2.5, 5, 10]);
  });

  it('Given bậc mặc định 4 kg của kettlebell, When lấy các mức chọn, Then chèn 4 kg đúng thứ tự', () => {
    expect(stepChoices(4)).toEqual([0.5, 1, 1.25, 2, 2.5, 4, 5, 10]);
  });
});

describe('hasWeightSettings', () => {
  it('Given bài tạ × reps, When hỏi có cài đặt tạ, Then có', () => {
    expect(hasWeightSettings('weight_reps', 'total')).toBe(true);
  });

  it('Given bài chỉ reps ghi tạ đeo thêm (hít xà, chống đẩy), When hỏi, Then có bậc tạ đeo thêm', () => {
    expect(hasWeightSettings('reps', 'added_weight')).toBe(true);
  });

  it('Given bài đo thời gian hay quãng đường của dụng cụ bodyweight, When hỏi, Then không có cài đặt tạ', () => {
    expect(hasWeightSettings('duration', 'added_weight')).toBe(false);
    expect(hasWeightSettings('distance', 'added_weight')).toBe(false);
  });
});
