import { describe, expect, it } from 'vitest';
import {
  SYNC_PULL_MAX_CHANGES,
  SYNC_PUSH_MAX_EVENTS,
  SyncPullQuerySchema,
  SyncPullResponseSchema,
  SyncPushRequestSchema,
} from './index';

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

describe('GET /sync/pull', () => {
  it('query: since là cursor mờ, limit (chuỗi trong URL) trong khoảng cho phép', () => {
    expect(SyncPullQuerySchema.parse({})).toEqual({});
    expect(SyncPullQuerySchema.parse({ since: 'abc', limit: '2' })).toEqual({
      since: 'abc',
      limit: 2,
    });
    expect(SyncPullQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(
      SyncPullQuerySchema.safeParse({
        limit: String(SYNC_PULL_MAX_CHANGES + 1),
      }).success,
    ).toBe(false);
    expect(SyncPullQuerySchema.safeParse({ since: '' }).success).toBe(false);
  });

  it('response: thay đổi cùng hình dạng sự kiện outbox, kèm tombstone, cursor và hasMore', () => {
    const tombstone = {
      ...sessionEvent,
      payload: { ...session, deletedAt: '2026-11-22T11:00:00.000Z' },
    };
    expect(
      SyncPullResponseSchema.safeParse({
        changes: [sessionEvent, tombstone],
        cursor: 'abc',
        hasMore: false,
      }).success,
    ).toBe(true);
    expect(
      SyncPullResponseSchema.safeParse({
        changes: [],
        cursor: null,
        hasMore: false,
      }).success,
    ).toBe(true);
    expect(
      SyncPullResponseSchema.safeParse({
        changes: [{ ...sessionEvent, entity: 'users' }],
        cursor: 'abc',
        hasMore: false,
      }).success,
    ).toBe(false);
  });
});
