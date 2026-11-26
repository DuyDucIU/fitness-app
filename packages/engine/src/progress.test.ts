import { describe, expect, it } from 'vitest';
import {
  buildProgress,
  type ProgressExercise,
  type ProgressInput,
  type ProgressSession,
} from './progress';

/** Hôm nay: thứ Tư 18/11/2026; tuần này bắt đầu thứ Hai 16/11. */
const TODAY = '2026-11-18';

let n = 0;
function session(
  date: string,
  exercises: ProgressExercise[] = [],
): ProgressSession {
  n += 1;
  return { id: `s${n}`, date, exercises };
}

function bench(
  sets: [number | null, number | null][],
  extra: Partial<ProgressExercise> = {},
): ProgressExercise {
  return {
    exerciseId: 'bench',
    loadInput: 'total',
    metric: 'weight_reps',
    muscles: [
      { group: 'chest', role: 'primary' },
      { group: 'arms', role: 'secondary' },
      { group: 'shoulders', role: 'secondary' },
    ],
    sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })),
    ...extra,
  };
}

const run = (sessions: ProgressSession[], extra: Partial<ProgressInput> = {}) =>
  buildProgress({ today: TODAY, weeks: 16, months: 12, sessions, ...extra });

describe('buildProgress — tần suất theo tuần', () => {
  it('Given 16 tuần, Then trả 16 tuần ISO từ cũ tới mới, tuần cuối chứa hôm nay', () => {
    const { weeks } = run([]);
    expect(weeks).toHaveLength(16);
    expect(weeks.at(-1)?.start).toBe('2026-11-16');
    expect(weeks[0]?.start).toBe('2026-08-03');
    expect(weeks.every((w) => w.workouts === 0)).toBe(true);
  });

  it('Given buổi chủ nhật và thứ hai, Then chủ nhật thuộc tuần trước, thứ hai thuộc tuần này', () => {
    const { weeks } = run([
      session('2026-11-15'),
      session('2026-11-16'),
      session('2026-11-18'),
    ]);
    expect(weeks.at(-2)).toMatchObject({ start: '2026-11-09', workouts: 1 });
    expect(weeks.at(-1)).toMatchObject({ start: '2026-11-16', workouts: 2 });
  });

  it('Given buổi cũ hơn khoảng trả về, Then không tính vào tuần nào', () => {
    const { weeks } = run([session('2026-08-02')]);
    expect(weeks.reduce((sum, w) => sum + w.workouts, 0)).toBe(0);
  });
});

describe('buildProgress — tần suất theo tháng', () => {
  it('Given 12 tháng, Then trả 12 tháng từ cũ tới mới, tháng cuối là tháng này', () => {
    const { months } = run([
      session('2026-11-01'),
      session('2026-11-18'),
      session('2026-10-31'),
      session('2025-12-01'),
      session('2025-11-30'),
    ]);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ start: '2025-12-01', workouts: 1 });
    expect(months.at(-2)).toEqual({ start: '2026-10-01', workouts: 1 });
    expect(months.at(-1)).toEqual({ start: '2026-11-01', workouts: 2 });
  });
});

describe('buildProgress — working set theo nhóm cơ (đếm nửa set cho cơ phụ)', () => {
  it('Given 3 set bench (ngực chính; tay, vai phụ), Then ngực 3, tay 1,5, vai 1,5', () => {
    const { weeks } = run([
      session('2026-11-17', [
        bench([
          [80, 8],
          [80, 8],
          [80, 7],
        ]),
      ]),
    ]);
    expect(weeks.at(-1)?.sets).toEqual({ chest: 3, arms: 1.5, shoulders: 1.5 });
  });

  it('Given nhóm vừa có cơ chính vừa có cơ phụ, Then mỗi set chỉ tính 1 cho nhóm đó', () => {
    const squat = bench([[100, 5]], {
      exerciseId: 'squat',
      muscles: [
        { group: 'legs', role: 'primary' },
        { group: 'legs', role: 'secondary' },
        { group: 'legs', role: 'secondary' },
        { group: 'back', role: 'secondary' },
      ],
    });
    const { weeks } = run([session('2026-11-17', [squat])]);
    expect(weeks.at(-1)?.sets).toEqual({ legs: 1, back: 0.5 });
  });

  it('Given bài không có nhóm cơ (bài tuỳ chỉnh), Then không tính cho nhóm nào', () => {
    const custom = bench([[50, 10]], { muscles: [] });
    const { weeks } = run([session('2026-11-17', [custom])]);
    expect(weeks.at(-1)?.sets).toEqual({});
  });

  it('Given bài bấm giờ và bài reps, Then set vẫn tính (đếm set, không cộng kg)', () => {
    const plank = bench([[null, null]], {
      exerciseId: 'plank',
      metric: 'duration',
      loadInput: 'total',
      muscles: [{ group: 'core', role: 'primary' }],
    });
    const pullup = bench(
      [
        [0, 10],
        [5, 6],
      ],
      {
        exerciseId: 'pullup',
        metric: 'reps',
        loadInput: 'added_weight',
        muscles: [{ group: 'back', role: 'primary' }],
      },
    );
    const { weeks } = run([session('2026-11-17', [plank, pullup])]);
    expect(weeks.at(-1)?.sets).toEqual({ core: 1, back: 2 });
  });
});

describe('buildProgress — e1RM theo bài và cách ghi tạ', () => {
  it('Given nhiều set, Then điểm của buổi là set có e1RM cao nhất, theo thứ tự ngày', () => {
    const { e1rm } = run([
      session('2026-11-10', [
        bench([
          [80, 8],
          [85, 5],
        ]),
      ]),
      session('2026-11-17', [bench([[90, 3]])]),
    ]);
    expect(e1rm).toEqual([
      {
        exerciseId: 'bench',
        loadInput: 'total',
        points: [
          {
            sessionId: 's' + (n - 1),
            date: '2026-11-10',
            e1rmKg: expect.closeTo(101.333, 3),
            weightKg: 80,
            reps: 8,
          },
          {
            sessionId: 's' + n,
            date: '2026-11-17',
            e1rmKg: expect.closeTo(99, 3),
            weightKg: 90,
            reps: 3,
          },
        ],
      },
    ]);
  });

  it('Given set quá 12 reps, Then không làm điểm e1RM; buổi chỉ có set như vậy thì không có điểm', () => {
    const { e1rm } = run([
      session('2026-11-10', [bench([[40, 20]])]),
      session('2026-11-17', [
        bench([
          [40, 20],
          [60, 12],
        ]),
      ]),
    ]);
    expect(e1rm).toHaveLength(1);
    expect(e1rm[0]?.points).toEqual([
      expect.objectContaining({ date: '2026-11-17', weightKg: 60, reps: 12 }),
    ]);
  });

  it('Given set không tạ hoặc chưa có reps, Then bỏ qua', () => {
    const { e1rm } = run([
      session('2026-11-17', [
        bench([
          [0, 8],
          [null, 8],
          [60, null],
          [60, 0],
        ]),
      ]),
    ]);
    expect(e1rm).toEqual([]);
  });

  it('Given cùng bài ghi bằng hai cách ghi tạ, Then hai đường riêng, không gộp (D15)', () => {
    const { e1rm } = run([
      session('2026-11-10', [bench([[30, 8]], { loadInput: 'per_dumbbell' })]),
      session('2026-11-17', [bench([[60, 8]])]),
    ]);
    expect(e1rm.map((s) => [s.loadInput, s.points.length])).toEqual([
      ['per_dumbbell', 1],
      ['total', 1],
    ]);
  });

  it('Given bài thêm hai lần trong một buổi cùng cách ghi, Then gộp thành một điểm', () => {
    const { e1rm } = run([
      session('2026-11-17', [bench([[80, 5]]), bench([[85, 5]])]),
    ]);
    expect(e1rm[0]?.points).toEqual([
      expect.objectContaining({ weightKg: 85, reps: 5 }),
    ]);
  });

  it('Given bài reps hay bấm giờ, Then không có đường e1RM', () => {
    const pullup = bench([[10, 5]], {
      exerciseId: 'pullup',
      metric: 'reps',
      loadInput: 'added_weight',
    });
    expect(run([session('2026-11-17', [pullup])]).e1rm).toEqual([]);
  });

  it('Given buổi cũ hơn khoảng tuần, Then vẫn có điểm e1RM (lọc khoảng ở màn hình)', () => {
    const { e1rm } = run([session('2025-01-06', [bench([[60, 5]])])]);
    expect(e1rm[0]?.points).toHaveLength(1);
  });
});
