import { describe, expect, it } from 'vitest';
import { SuggestionSchema, SyncPushRequestSchema } from './index';

const suggestion = {
  id: '9c3e5a1b-4b6d-4e0f-9c8a-3d4e5f6a7b82',
  exerciseId: '1d2e3f4a-5b6c-4d7e-8f90-a1b2c3d4e5f6',
  routineExerciseId: null,
  sessionExerciseId: null,
  basedOnSessionExerciseId: '8b2d4f0f-3a5c-4d9e-8b7f-2c3d4e5f6a71',
  kind: 'increase',
  strength: 'soft',
  reason: 'all_sets_top',
  payload: { sets: 3, top: 10 },
  status: 'pending',
  createdAt: '2026-11-24T08:00:00.000Z',
  respondedAt: null,
  deletedAt: null,
} as const;

describe('gợi ý', () => {
  it('gợi ý tăng trước buổi: mã lý do kèm tham số, chưa trả lời', () => {
    expect(SuggestionSchema.safeParse(suggestion).success).toBe(true);
  });

  it('từ chối loại gợi ý và trạng thái lạ', () => {
    expect(
      SuggestionSchema.safeParse({ ...suggestion, kind: 'transition' }).success,
    ).toBe(false);
    expect(
      SuggestionSchema.safeParse({ ...suggestion, status: 'seen' }).success,
    ).toBe(false);
  });

  it('từ chối mã lý do rỗng', () => {
    expect(
      SuggestionSchema.safeParse({ ...suggestion, reason: '' }).success,
    ).toBe(false);
  });

  it('đi qua outbox như dữ liệu buổi tập', () => {
    expect(
      SyncPushRequestSchema.safeParse({
        events: [{ entity: 'suggestions', op: 'upsert', payload: suggestion }],
      }).success,
    ).toBe(true);
  });
});
