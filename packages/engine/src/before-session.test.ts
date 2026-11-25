import { describe, expect, it } from 'vitest';
import {
  beforeSession,
  type BeforeSessionInput,
  type PastSession,
  type Target,
} from './before-session';
import { prefillFromLast } from './last-time';

const TODAY = '2026-11-24';

const sixToTen: Target = {
  repMin: 6,
  repMax: 10,
  targetDurationMinS: null,
  targetDurationMaxS: null,
};

/** Một buổi đã ghi: các set dạng [tạ, reps]. */
function session(
  sets: [number | null, number][],
  extra: Partial<PastSession> = {},
): PastSession {
  return {
    sessionExerciseId: crypto.randomUUID(),
    startedAt: '2026-11-20T10:00:00.000Z',
    loadInput: 'total',
    sets: sets.map(([weight, reps]) => ({ weight, reps, durationS: null })),
    target: sixToTen,
    ...extra,
  };
}

function input(
  history: PastSession[],
  extra: Partial<BeforeSessionInput> = {},
): BeforeSessionInput {
  return {
    today: TODAY,
    metric: 'weight_reps',
    target: sixToTen,
    history,
    ...extra,
  };
}

describe('beforeSession — R1 nên tăng', () => {
  it('Given buổi gần nhất cùng mức tạ, mọi working set đạt trần, When trước buổi, Then gợi ý chung nên tăng, không kèm mức tạ', () => {
    const result = beforeSession(
      input([
        session([
          [40, 10],
          [40, 10],
          [40, 11],
        ]),
      ]),
    );
    expect(result.suggestion).toEqual({
      kind: 'increase',
      reason: 'all_sets_top',
      params: { sets: 3, min: 6, top: 10 },
    });
    expect(result.hint).toEqual({ code: 'topped_out', top: 10 });
  });

  it('Given một set chưa đạt trần, When trước buổi, Then không gợi ý tăng, nhắc còn một set thiếu', () => {
    const result = beforeSession(
      input([
        session([
          [40, 10],
          [40, 10],
          [40, 8],
        ]),
      ]),
    );
    expect(result.suggestion).toBeNull();
    expect(result.hint).toEqual({ code: 'one_short', sets: 3, top: 10 });
  });

  it('Given nhiều set chưa đạt trần, When trước buổi, Then nhắc giữ mức tạ và lên dần tới trần', () => {
    const result = beforeSession(
      input([
        session([
          [80, 8],
          [80, 8],
          [80, 7],
        ]),
      ]),
    );
    expect(result.suggestion).toBeNull();
    expect(result.hint).toEqual({ code: 'build_to_top', top: 10, weight: 80 });
  });

  it('Given chưa có lịch sử, When trước buổi, Then không có gợi ý lẫn câu nhắc (R8)', () => {
    expect(beforeSession(input([]))).toEqual({ suggestion: null, hint: null });
  });
});

describe('beforeSession — R2 chúc mừng và nhắc lại', () => {
  it('Given hai buổi liền nhau cùng mức tạ đều đạt trần, When trước buổi, Then chúc mừng và nhắc lại', () => {
    const result = beforeSession(
      input([
        session([
          [40, 10],
          [40, 10],
        ]),
        session([
          [40, 10],
          [40, 10],
        ]),
      ]),
    );
    expect(result.suggestion).toEqual({
      kind: 'celebrate',
      reason: 'top_again',
      params: { sets: 2, min: 6, top: 10 },
    });
  });

  it('Given buổi trước đạt trần, buổi này đã lên tạ và lại đạt trần, When trước buổi, Then là R1 chứ không phải R2', () => {
    const result = beforeSession(
      input([
        session([
          [42.5, 10],
          [42.5, 10],
        ]),
        session([
          [40, 10],
          [40, 10],
        ]),
      ]),
    );
    expect(result.suggestion?.kind).toBe('increase');
  });

  it('Given buổi trước chưa đạt trần, When trước buổi, Then là R1', () => {
    const result = beforeSession(
      input([
        session([
          [40, 10],
          [40, 10],
        ]),
        session([
          [40, 9],
          [40, 8],
        ]),
      ]),
    );
    expect(result.suggestion?.kind).toBe('increase');
  });

  it('Given hai buổi đạt trần nhưng ghi tạ theo quy ước khác nhau, When trước buổi, Then là R1', () => {
    const result = beforeSession(
      input([
        session([[20, 10]], { loadInput: 'per_dumbbell' }),
        session([[20, 10]], { loadInput: 'total' }),
      ]),
    );
    expect(result.suggestion?.kind).toBe('increase');
  });
});

describe('beforeSession — R4 giai đoạn chuyển mức', () => {
  it('Given buổi gần nhất các set khác mức tạ, dù mọi set đạt trần, When trước buổi, Then không gợi ý tăng, nhắc làm lại đúng từng set', () => {
    const result = beforeSession(
      input([
        session([
          [45, 10],
          [40, 10],
          [40, 10],
        ]),
      ]),
    );
    expect(result).toEqual({ suggestion: null, hint: { code: 'transition' } });
  });

  it('Given giai đoạn chuyển mức, When điền sẵn từng set, Then đúng mức tạ từng set của buổi trước', () => {
    const last = session([
      [45, 8],
      [40, 10],
      [40, 9],
    ]);
    expect(
      [0, 1, 2].map((i) => prefillFromLast(last, i, 'total')?.weight),
    ).toEqual([45, 40, 40]);
  });
});

describe('beforeSession — bài ad hoc', () => {
  it('Given bài ad hoc, lần gần nhất có rep range là buổi theo routine, When trước buổi, Then dùng rep range đó', () => {
    const result = beforeSession(
      input(
        [
          session(
            [
              [40, 12],
              [40, 12],
            ],
            { target: null },
          ),
          session([[40, 9]], {
            target: { ...sixToTen, repMin: 8, repMax: 12 },
          }),
        ],
        { target: null },
      ),
    );
    expect(result.suggestion).toEqual({
      kind: 'increase',
      reason: 'all_sets_top',
      params: { sets: 2, min: 8, top: 12 },
    });
  });

  it('Given bài ad hoc chưa từng có rep range, When trước buổi, Then không chạy luật, chỉ hiện số lần trước', () => {
    const result = beforeSession(
      input([session([[40, 12]], { target: null })], { target: null }),
    );
    expect(result).toEqual({ suggestion: null, hint: null });
  });
});

describe('beforeSession — bài không đo bằng tạ × reps', () => {
  it('Given bài chỉ reps, mọi set đạt trần, When trước buổi, Then R1 dùng rep_max như thường', () => {
    const result = beforeSession(
      input(
        [
          session([
            [null, 12],
            [null, 12],
          ]),
        ],
        { metric: 'reps', target: { ...sixToTen, repMin: 8, repMax: 12 } },
      ),
    );
    expect(result.suggestion?.reason).toBe('all_sets_top');
  });

  it('Given bài đo thời gian, mọi set đạt thời gian trần, When trước buổi, Then gợi ý chung nên tăng thời gian', () => {
    const plank: Target = {
      repMin: null,
      repMax: null,
      targetDurationMinS: 30,
      targetDurationMaxS: 60,
    };
    const held = (seconds: number[]) => ({
      ...session([], { target: plank }),
      sets: seconds.map((durationS) => ({
        weight: null,
        reps: null,
        durationS,
      })),
    });
    const metric = { metric: 'duration', target: plank } as const;
    expect(beforeSession(input([held([60, 65])], metric)).suggestion).toEqual({
      kind: 'increase',
      reason: 'all_sets_top',
      params: { sets: 2, min: 30, top: 60 },
    });
    expect(
      beforeSession(input([held([60, 45])], metric)).suggestion,
    ).toBeNull();
  });

  it('Given bài đo quãng đường, When trước buổi, Then chưa có luật', () => {
    const result = beforeSession(
      input([session([[null, 0]])], {
        metric: 'distance',
      }),
    );
    expect(result).toEqual({ suggestion: null, hint: null });
  });
});
