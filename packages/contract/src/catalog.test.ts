import { describe, expect, it } from 'vitest';
import { CatalogResponseSchema } from './index';

const validExercise = {
  id: '6f1d2c0a-8d63-4a0e-9b1b-3f6c3d6c9b11',
  nameEn: 'Barbell Bench Press - Medium Grip',
  nameVi: 'Đẩy ngực ngang tạ đòn',
  equipment: 'barbell',
  mechanic: 'compound',
  metricType: 'weight_reps',
  mine: false,
  isArchived: false,
  muscles: [
    {
      code: 'chest',
      nameEn: 'Chest',
      nameVi: 'Ngực',
      muscleGroup: 'chest',
      role: 'primary',
    },
  ],
  aliases: [{ alias: 'đẩy ngực', lang: 'vi', mine: false }],
};

describe('catalog', () => {
  it('chấp nhận catalog hợp lệ, kể cả bài tuỳ chỉnh thiếu tên Việt và dụng cụ', () => {
    const custom = {
      ...validExercise,
      nameVi: null,
      equipment: null,
      mechanic: null,
      mine: true,
      muscles: [],
      aliases: [],
    };
    expect(
      CatalogResponseSchema.safeParse({ exercises: [validExercise, custom] })
        .success,
    ).toBe(true);
  });

  it('từ chối metricType lạ', () => {
    expect(
      CatalogResponseSchema.safeParse({
        exercises: [{ ...validExercise, metricType: 'calories' }],
      }).success,
    ).toBe(false);
  });

  it('từ chối vai trò nhóm cơ ngoài primary|secondary', () => {
    expect(
      CatalogResponseSchema.safeParse({
        exercises: [
          {
            ...validExercise,
            muscles: [{ ...validExercise.muscles[0], role: 'main' }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
