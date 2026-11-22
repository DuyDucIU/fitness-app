import { z } from 'zod';

import {
  SessionExerciseSchema,
  SetLogSchema,
  WorkoutSessionSchema,
} from './workout';

/**
 * Đồng bộ outbox (SDD 3.2): app đẩy các sự kiện outbox theo thứ tự ghi; server upsert
 * idempotent theo id nên gửi lại cùng một batch không tạo bản ghi trùng.
 */

/**
 * Số sự kiện tối đa trong một lần đẩy. Mỗi bản ghi chỉ vài trăm byte, nên một batch đầy
 * vẫn dưới giới hạn body JSON mặc định (100kb) của API.
 */
export const SYNC_PUSH_MAX_EVENTS = 100;

/**
 * Một sự kiện outbox: bản ghi đầy đủ của bảng `entity` tại thời điểm thay đổi. Xoá là
 * tombstone `deletedAt` nên mọi sự kiện đều là upsert.
 */
export const SyncEventSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('workout_sessions'),
    op: z.literal('upsert'),
    payload: WorkoutSessionSchema,
  }),
  z.object({
    entity: z.literal('session_exercises'),
    op: z.literal('upsert'),
    payload: SessionExerciseSchema,
  }),
  z.object({
    entity: z.literal('set_logs'),
    op: z.literal('upsert'),
    payload: SetLogSchema,
  }),
]);
export type SyncEvent = z.infer<typeof SyncEventSchema>;

/** Bảng phía server mà outbox đẩy lên, cũng là `entity` của sự kiện. */
export type SyncEntity = SyncEvent['entity'];

/** POST /v1/sync/push — các sự kiện theo đúng thứ tự `seq` trên máy. */
export const SyncPushRequestSchema = z.object({
  events: z.array(SyncEventSchema).min(1).max(SYNC_PUSH_MAX_EVENTS),
});
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;

/** Server đã lưu cả batch (hoặc không lưu gì, khi lỗi). */
export const SyncPushResponseSchema = z.object({
  applied: z.int().nonnegative(),
});
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;
