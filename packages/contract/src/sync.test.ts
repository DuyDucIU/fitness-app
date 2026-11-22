import { describe, expect, it } from 'vitest';
import { SYNC_PUSH_MAX_EVENTS, SyncPushRequestSchema } from './index';

const session = {
  id: '7a1c3e9e-2f4b-4c8d-9a6e-1b2c3d4e5f60',
  routineDayId: null,
  startedAt: '2026-11-22T10:00:00.000Z',
  endedAt: null,
  notes: null,
  deletedAt: null,
};

const sessionEvent = {
  entity: 'workout_sessions',
  op: 'upsert',
  payload: session,
} as const;

describe('POST /sync/push', () => {
  it('nhận batch sự kiện outbox, payload kiểm theo bảng của sự kiện', () => {
    expect(
      SyncPushRequestSchema.safeParse({ events: [sessionEvent] }).success,
    ).toBe(true);
    // Bản ghi buổi tập không phải một set.
    expect(
      SyncPushRequestSchema.safeParse({
        events: [{ ...sessionEvent, entity: 'set_logs' }],
      }).success,
    ).toBe(false);
  });

  it('từ chối bảng lạ và batch rỗng', () => {
    expect(
      SyncPushRequestSchema.safeParse({
        events: [{ ...sessionEvent, entity: 'users' }],
      }).success,
    ).toBe(false);
    expect(SyncPushRequestSchema.safeParse({ events: [] }).success).toBe(false);
  });

  it(`từ chối batch quá ${SYNC_PUSH_MAX_EVENTS} sự kiện`, () => {
    const events = Array.from({ length: SYNC_PUSH_MAX_EVENTS + 1 }, () => ({
      ...sessionEvent,
    }));
    expect(SyncPushRequestSchema.safeParse({ events }).success).toBe(false);
    expect(
      SyncPushRequestSchema.safeParse({ events: events.slice(1) }).success,
    ).toBe(true);
  });
});
