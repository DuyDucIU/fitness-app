import { describe, expect, it } from 'vitest';
import { ExerciseSettingSchema, SyncPushRequestSchema } from './index';

const setting = {
  exerciseId: '7a1c3e9e-2f4b-4c8d-9a6e-1b2c3d4e5f60',
  weightStepKg: 2.5,
  loadInput: 'total',
  barWeightKg: 15,
  restAutoStart: false,
};

describe('USER_EXERCISE_SETTINGS', () => {
  it('nhận cả dòng cài đặt của một bài, đòn có thể không có', () => {
    expect(ExerciseSettingSchema.safeParse(setting).success).toBe(true);
    expect(
      ExerciseSettingSchema.safeParse({ ...setting, barWeightKg: null })
        .success,
    ).toBe(true);
  });

  it('từ chối bậc tạ không dương, đòn âm và quy ước ghi tạ lạ', () => {
    for (const bad of [
      { weightStepKg: 0 },
      { barWeightKg: -5 },
      { loadInput: 'per_hand' },
    ]) {
      expect(
        ExerciseSettingSchema.safeParse({ ...setting, ...bad }).success,
      ).toBe(false);
    }
  });

  it('đi qua sync push như mọi bảng outbox', () => {
    expect(
      SyncPushRequestSchema.safeParse({
        events: [
          { entity: 'user_exercise_settings', op: 'upsert', payload: setting },
        ],
      }).success,
    ).toBe(true);
  });
});
