import { describe, expect, it } from 'vitest';
import { type LastTime, prefillFromLast } from './last-time';

const bench: LastTime = {
  startedAt: '2026-11-19T10:00:00.000Z',
  loadInput: 'total',
  sets: [
    { weight: 80, reps: 8 },
    { weight: 80, reps: 8 },
    { weight: 80, reps: 7 },
  ],
};

describe('prefillFromLast', () => {
  it('Given lần trước 3 set, When điền set thứ i, Then lấy đúng set thứ i của lần trước', () => {
    expect(prefillFromLast(bench, 0, 'total')).toEqual({ weight: 80, reps: 8 });
    expect(prefillFromLast(bench, 2, 'total')).toEqual({ weight: 80, reps: 7 });
  });

  it('Given buổi này nhiều set hơn lần trước, When điền set dư, Then lấy set cuối của lần trước', () => {
    expect(prefillFromLast(bench, 4, 'total')).toEqual({ weight: 80, reps: 7 });
  });

  it('Given chưa có lịch sử, When điền, Then không có gì để điền (R8)', () => {
    expect(prefillFromLast(null, 0, 'total')).toBeNull();
  });

  it('Given lần trước ghi tạ theo quy ước khác, When điền, Then không điền sẵn', () => {
    expect(prefillFromLast(bench, 0, 'per_side')).toBeNull();
  });
});
