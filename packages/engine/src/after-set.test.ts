import { describe, expect, it } from 'vitest';
import { afterSet, type AfterSetInput } from './after-set';
import type { PastSession, Target } from './before-session';

const sixToEight: Target = {
  repMin: 6,
  repMax: 8,
  targetDurationMinS: null,
  targetDurationMaxS: null,
};

/** Bench (tạ đòn, ghi tổng) 3 × 6–8, vừa ghi set 1 ở 80 kg. */
function input(extra: Partial<AfterSetInput> = {}): AfterSetInput {
  return {
    metric: 'weight_reps',
    target: sixToEight,
    history: [],
    set: { weight: 80, reps: 4, rpe: null },
    setsLeft: 2,
    loadInput: 'total',
    stepKg: 2.5,
    barWeightKg: 20,
    ...extra,
  };
}

describe('afterSet — R3 back-off', () => {
  it('Given set vừa ghi dưới sàn rep range, When ghi xong, Then gợi ý giảm một step cho các set còn lại', () => {
    expect(afterSet(input())).toEqual({
      kind: 'back_off',
      reason: 'under_min',
      params: { reps: 4, min: 6, from: 80, to: 77.5, sets: 2 },
    });
  });

  it('Given mức tạ lệch ladder (tạ đơn 23 kg, step 2), When back-off, Then 21 kg làm tròn về bậc gần nhất, cách đều thì xuống: 20 kg', () => {
    const result = afterSet(
      input({
        set: { weight: 23, reps: 4, rpe: null },
        loadInput: 'per_dumbbell',
        stepKg: 2,
        barWeightKg: null,
      }),
    );
    expect(result?.params.to).toBe(20);
  });

  it('Given tạ đòn 21 kg ghi tổng, When back-off, Then không xuống dưới đòn 20 kg', () => {
    const result = afterSet(input({ set: { weight: 21, reps: 4, rpe: null } }));
    expect(result?.params.to).toBe(20);
  });

  it('Given ghi mỗi bên (không phải tổng), When back-off, Then đòn không là sàn', () => {
    const result = afterSet(
      input({ set: { weight: 10, reps: 4, rpe: null }, loadInput: 'per_side' }),
    );
    expect(result?.params.to).toBe(7.5);
  });

  it('Given đang ở đúng mức đòn trống 20 kg, When set dưới sàn, Then không gợi ý vì không giảm được nữa', () => {
    expect(afterSet(input({ set: { weight: 20, reps: 4, rpe: null } }))).toBe(
      null,
    );
  });

  it('Given đang ở 0 kg, When set dưới sàn, Then không gợi ý', () => {
    expect(
      afterSet(
        input({
          set: { weight: 0, reps: 4, rpe: null },
          loadInput: 'stack',
          barWeightKg: null,
        }),
      ),
    ).toBe(null);
  });

  it('Given set đúng sàn rep range với RPE 10, When ghi xong, Then gợi ý back-off (lý do kiệt sức ở sàn)', () => {
    expect(afterSet(input({ set: { weight: 80, reps: 6, rpe: 10 } }))).toEqual({
      kind: 'back_off',
      reason: 'min_all_out',
      params: { reps: 6, min: 6, from: 80, to: 77.5, sets: 2 },
    });
  });

  it('Given set đúng sàn rep range với RPE 9, When ghi xong, Then không gợi ý', () => {
    expect(afterSet(input({ set: { weight: 80, reps: 6, rpe: 9 } }))).toBe(
      null,
    );
  });

  it('Given set đúng sàn rep range không ghi RPE, When ghi xong, Then không gợi ý', () => {
    expect(afterSet(input({ set: { weight: 80, reps: 6, rpe: null } }))).toBe(
      null,
    );
  });

  it('Given set vừa ghi trong rep range, When ghi xong, Then không gợi ý', () => {
    expect(afterSet(input({ set: { weight: 80, reps: 7, rpe: null } }))).toBe(
      null,
    );
  });

  it('Given set dưới sàn là set cuối của bài, When ghi xong, Then không gợi ý vì không còn set nào', () => {
    expect(afterSet(input({ setsLeft: 0 }))).toBe(null);
  });

  it('Given bài ad hoc, lần gần nhất không có rep range nhưng lần trước đó 8–12, When set 7 reps, Then back-off theo sàn 8', () => {
    const past = (target: Target | null): PastSession => ({
      sessionExerciseId: crypto.randomUUID(),
      startedAt: '2026-11-20T10:00:00.000Z',
      loadInput: 'total',
      sets: [{ weight: 80, reps: 8, durationS: null }],
      target,
    });
    const result = afterSet(
      input({
        target: null,
        history: [past(null), past({ ...sixToEight, repMin: 8, repMax: 12 })],
        set: { weight: 80, reps: 7, rpe: null },
      }),
    );
    expect(result?.params.min).toBe(8);
  });

  it('Given bài ad hoc chưa từng có rep range, When set rất ít reps, Then không gợi ý', () => {
    expect(afterSet(input({ target: null, history: [] }))).toBe(null);
  });

  it.each(['reps', 'duration', 'distance'] as const)(
    'Given bài đo bằng %s, When set dưới sàn, Then không gợi ý (R3 chỉ cho weight_reps)',
    (metric) => {
      expect(afterSet(input({ metric }))).toBe(null);
    },
  );
});
