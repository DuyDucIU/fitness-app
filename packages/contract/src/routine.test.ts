import { describe, expect, it } from 'vitest';
import {
  CreateRoutineRequestSchema,
  ReorderRequestSchema,
  RoutineExerciseInputSchema,
  UpdateRoutineExerciseRequestSchema,
} from './index';

const BENCH = '00000000-0000-4000-8000-000000000001';

const target = {
  exerciseId: BENCH,
  targetSets: 3,
  repMin: 8,
  repMax: 12,
  targetDurationMinS: null,
  targetDurationMaxS: null,
  initialWeightKg: null,
  warmupEnabled: false,
  restSeconds: 90,
};

describe('Routine (UC05)', () => {
  it('tạo routine: cần tên và ít nhất một ngày tập, tên được cắt khoảng trắng', () => {
    const parsed = CreateRoutineRequestSchema.parse({
      name: '  Upper / lower ',
      isActive: true,
      days: [{ name: 'Day 1' }, { name: 'Day 2' }],
    });
    expect(parsed.name).toBe('Upper / lower');
    expect(
      CreateRoutineRequestSchema.safeParse({
        name: 'X',
        isActive: false,
        days: [],
      }).success,
    ).toBe(false);
    expect(
      CreateRoutineRequestSchema.safeParse({
        name: '   ',
        isActive: false,
        days: [{ name: 'Day 1' }],
      }).success,
    ).toBe(false);
  });

  it('bài trong ngày: ít nhất 1 set, rep range không ngược, nghỉ không âm', () => {
    expect(RoutineExerciseInputSchema.safeParse(target).success).toBe(true);
    for (const bad of [
      { targetSets: 0 },
      { repMin: 12, repMax: 8 },
      { restSeconds: -15 },
      { initialWeightKg: -1 },
      { targetDurationMinS: 60, targetDurationMaxS: 30 },
    ]) {
      expect(
        RoutineExerciseInputSchema.safeParse({ ...target, ...bad }).success,
      ).toBe(false);
    }
  });

  it('bài đo thời gian hoặc quãng đường không cần rep range', () => {
    expect(
      RoutineExerciseInputSchema.safeParse({
        ...target,
        repMin: null,
        repMax: null,
        targetDurationMinS: 30,
        targetDurationMaxS: 60,
      }).success,
    ).toBe(true);
  });

  it('sửa bài: chỉ gửi trường đổi, vẫn không cho rep range ngược', () => {
    expect(
      UpdateRoutineExerciseRequestSchema.safeParse({ targetSets: 4 }).success,
    ).toBe(true);
    expect(
      UpdateRoutineExerciseRequestSchema.safeParse({ repMin: 10, repMax: 6 })
        .success,
    ).toBe(false);
  });

  it('sắp thứ tự: danh sách id không trùng', () => {
    expect(ReorderRequestSchema.safeParse({ ids: [BENCH] }).success).toBe(
      true,
    );
    expect(
      ReorderRequestSchema.safeParse({ ids: [BENCH, BENCH] }).success,
    ).toBe(false);
  });
});
