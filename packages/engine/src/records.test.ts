import { describe, expect, it } from 'vitest';
import { e1rm, newRecords, type NewRecordsInput } from './records';

/** Bench (tạ đòn, ghi tổng): buổi trước 80 × 8, 80 × 8, 80 × 7. */
function input(extra: Partial<NewRecordsInput> = {}): NewRecordsInput {
  return {
    metric: 'weight_reps',
    loadInput: 'total',
    history: [
      {
        loadInput: 'total',
        sets: [
          { weight: 80, reps: 8 },
          { weight: 80, reps: 8 },
          { weight: 80, reps: 7 },
        ],
      },
    ],
    earlier: [],
    set: { weight: 80, reps: 8 },
    ...extra,
  };
}

const types = (i: NewRecordsInput) => newRecords(i).map((r) => r.type);

describe('e1rm — Epley', () => {
  it('Given 100 kg × 5, Then e1RM = 100 × (1 + 5/30)', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.667, 3);
  });
});

describe('newRecords — e1RM (tạ × reps)', () => {
  it('Given set vượt e1RM cũ, When ghi xong, Then có PR e1RM với giá trị mới', () => {
    expect(newRecords(input({ set: { weight: 85, reps: 8 } }))).toEqual([
      { type: 'e1rm', value: e1rm(85, 8), reps: 8 },
    ]);
  });

  it('Given set bằng e1RM cũ, When ghi xong, Then không có PR', () => {
    expect(newRecords(input())).toEqual([]);
  });

  it('Given 75 × 6 có e1RM bằng đúng kỷ lục 60 × 15 (cùng 90), Then không có PR', () => {
    expect(
      types(
        input({
          history: [{ loadInput: 'total', sets: [{ weight: 60, reps: 15 }] }],
          set: { weight: 75, reps: 6 },
        }),
      ),
    ).toEqual([]);
  });

  it('Given set trước trong buổi đã vượt kỷ lục, When set sau thấp hơn set đó, Then không có PR', () => {
    expect(
      types(
        input({
          earlier: [{ weight: 90, reps: 8 }],
          set: { weight: 85, reps: 8 },
        }),
      ),
    ).not.toContain('e1rm');
  });

  it('Given lịch sử ghi theo quy ước khác (mỗi bên), When ghi tổng, Then không so với lịch sử đó', () => {
    expect(
      newRecords(
        input({
          history: [
            { loadInput: 'per_side', sets: [{ weight: 30, reps: 8 }] },
            {
              loadInput: 'total',
              sets: [
                { weight: 80, reps: 8 },
                { weight: 80, reps: 8 },
              ],
            },
          ],
          set: { weight: 82.5, reps: 8 },
        }),
      ).map((r) => r.type),
    ).toEqual(['e1rm']);
    expect(
      newRecords(
        input({
          history: [{ loadInput: 'total', sets: [{ weight: 30, reps: 8 }] }],
          loadInput: 'per_side',
          set: { weight: 35, reps: 8 },
        }),
      ),
    ).toEqual([]);
  });
});

describe('newRecords — lần đầu tập bài', () => {
  it('Given chưa có buổi nào của bài, When ghi set, Then không có PR', () => {
    expect(newRecords(input({ history: [] }))).toEqual([]);
  });

  it('Given chưa có buổi nào, When set 2 trong buổi đầu vượt set 1, Then vẫn không có PR', () => {
    expect(
      newRecords(
        input({
          history: [],
          earlier: [{ weight: 60, reps: 8 }],
          set: { weight: 70, reps: 8 },
        }),
      ),
    ).toEqual([]);
  });

  it('Given buổi trước không có set nào đủ số, Then coi như chưa có lịch sử', () => {
    expect(
      newRecords(
        input({
          history: [{ loadInput: 'total', sets: [{ weight: 80, reps: null }] }],
        }),
      ),
    ).toEqual([]);
  });
});

describe('newRecords — session_volume', () => {
  it('Given tổng tạ × reps trong buổi vượt buổi cao nhất trước đó (1840), When set đẩy tổng qua kỷ lục, Then có PR session_volume với tổng mới', () => {
    expect(
      newRecords(
        input({
          earlier: [
            { weight: 80, reps: 8 },
            { weight: 80, reps: 8 },
          ],
          set: { weight: 80, reps: 8 },
        }),
      ),
    ).toEqual([{ type: 'session_volume', value: 1920, reps: null }]);
  });

  it('Given tổng đã vượt kỷ lục ở set trước, When ghi thêm set, Then không báo lại', () => {
    expect(
      types(
        input({
          earlier: [
            { weight: 80, reps: 8 },
            { weight: 80, reps: 8 },
            { weight: 80, reps: 8 },
          ],
          set: { weight: 60, reps: 8 },
        }),
      ),
    ).toEqual([]);
  });

  it('Given một set vừa vượt e1RM vừa đẩy tổng qua kỷ lục, Then có cả hai, PR theo set đứng trước', () => {
    expect(
      types(
        input({
          earlier: [
            { weight: 80, reps: 8 },
            { weight: 80, reps: 8 },
          ],
          set: { weight: 85, reps: 8 },
        }),
      ),
    ).toEqual(['e1rm', 'session_volume']);
  });
});

describe('newRecords — bài chỉ reps', () => {
  const pushups = (extra: Partial<NewRecordsInput>) =>
    input({
      metric: 'reps',
      loadInput: 'added_weight',
      history: [
        {
          loadInput: 'added_weight',
          sets: [
            { weight: null, reps: 15 },
            { weight: null, reps: 12 },
          ],
        },
      ],
      ...extra,
    });

  it('Given set nhiều reps hơn mọi set trước, Then có PR max_reps', () => {
    expect(newRecords(pushups({ set: { weight: null, reps: 16 } }))).toEqual([
      { type: 'max_reps', value: 16, reps: 16 },
    ]);
  });

  it('Given set bằng số reps cao nhất, Then không có PR max_reps', () => {
    expect(types(pushups({ set: { weight: null, reps: 15 } }))).toEqual([]);
  });

  it('Given tổng reps trong buổi vượt buổi cao nhất (27), Then có PR session_volume tính bằng reps', () => {
    expect(
      newRecords(
        pushups({
          earlier: [{ weight: null, reps: 14 }],
          set: { weight: null, reps: 14 },
        }),
      ),
    ).toEqual([{ type: 'session_volume', value: 28, reps: null }]);
  });
});

describe('newRecords — tạ đeo thêm (weight_at_reps)', () => {
  const pullups = (extra: Partial<NewRecordsInput>) =>
    input({
      metric: 'reps',
      loadInput: 'added_weight',
      history: [
        {
          loadInput: 'added_weight',
          sets: [
            { weight: 10, reps: 8 },
            { weight: 0, reps: 12 },
          ],
        },
      ],
      ...extra,
    });

  it('Given tạ đeo thêm nặng hơn mọi set trước có ít nhất N reps, Then có PR weight_at_reps cho N', () => {
    expect(newRecords(pullups({ set: { weight: 12.5, reps: 5 } }))).toEqual([
      { type: 'weight_at_reps', value: 12.5, reps: 5 },
    ]);
  });

  it('Given tạ bằng mức nặng nhất ở ≥ N reps, Then không có PR', () => {
    expect(types(pullups({ set: { weight: 10, reps: 6 } }))).toEqual([]);
  });

  it('Given set BW (0 kg) nhiều reps hơn mọi set BW trước, Then là max_reps, không so với set có tạ', () => {
    expect(types(pullups({ set: { weight: 0, reps: 13 } }))).toEqual([
      'max_reps',
    ]);
  });
});

describe('newRecords — bài bấm giờ, quãng đường', () => {
  it('Given bài bấm giờ, Then chưa có loại PR', () => {
    expect(
      newRecords(
        input({ metric: 'duration', set: { weight: null, reps: null } }),
      ),
    ).toEqual([]);
  });
});
