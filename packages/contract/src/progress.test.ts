import { describe, expect, it } from 'vitest';
import { ProgressResponseSchema } from './index';

const SESSION = '00000000-0000-4000-8000-000000000001';
const BENCH = '00000000-0000-4000-8000-000000000002';

const sets = {
  chest: 3,
  back: 0,
  shoulders: 1.5,
  arms: 1.5,
  legs: 0,
  core: 0,
  neck: 0,
};

const response = {
  today: '2026-11-18',
  weeks: [{ start: '2026-11-16', workouts: 1, sets }],
  months: [{ start: '2026-11-01', workouts: 1 }],
  e1rm: [
    {
      exerciseId: BENCH,
      loadInput: 'total',
      points: [
        {
          sessionId: SESSION,
          date: '2026-11-17',
          e1rmKg: 101.33,
          weightKg: 80,
          reps: 8,
        },
      ],
    },
  ],
};

describe('Progress (UC19)', () => {
  it('nhận số set lẻ nửa set và đường e1RM theo cách ghi tạ', () => {
    expect(ProgressResponseSchema.parse(response)).toEqual(response);
  });

  it('mỗi tuần có đủ mọi nhóm cơ', () => {
    const missing: Partial<typeof sets> = { ...sets };
    delete missing.neck;
    expect(
      ProgressResponseSchema.safeParse({
        ...response,
        weeks: [{ start: '2026-11-16', workouts: 1, sets: missing }],
      }).success,
    ).toBe(false);
  });

  it('ngày là ngày lịch YYYY-MM-DD, không phải mốc thời gian', () => {
    expect(
      ProgressResponseSchema.safeParse({
        ...response,
        today: '2026-11-18T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
