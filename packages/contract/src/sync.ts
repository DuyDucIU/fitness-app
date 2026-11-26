import { z } from 'zod';

import { ExerciseSettingSchema } from './exercise-setting';
import { SuggestionSchema } from './suggestion';
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
 * tombstone `deletedAt` nên mọi sự kiện đều là upsert. Khoá của bản ghi là `id`, trừ
 * `user_exercise_settings` khoá theo `exerciseId` (xem `syncKeyOf`).
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
  z.object({
    entity: z.literal('suggestions'),
    op: z.literal('upsert'),
    payload: SuggestionSchema,
  }),
  z.object({
    entity: z.literal('user_exercise_settings'),
    op: z.literal('upsert'),
    payload: ExerciseSettingSchema,
  }),
]);
export type SyncEvent = z.infer<typeof SyncEventSchema>;

/** Bảng phía server mà outbox đẩy lên, cũng là `entity` của sự kiện. */
export type SyncEntity = SyncEvent['entity'];

/** Khoá của bản ghi trong sự kiện: `id`, hoặc bài với cài đặt bài tập (khoá user × bài). */
export function syncKeyOf(event: SyncEvent): string {
  return event.entity === 'user_exercise_settings'
    ? event.payload.exerciseId
    : event.payload.id;
}

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

/**
 * Kéo thay đổi về (SDD 3.2): mọi bảng đi qua outbox, theo thứ tự `updated_at` server đặt,
 * kể cả tombstone. Mỗi thay đổi có cùng hình dạng sự kiện outbox (bản ghi đầy đủ), nên
 * thêm bảng mới vào `SyncEventSchema` là pull trả được bảng đó.
 */

/** Số thay đổi tối đa trong một trang pull. */
export const SYNC_PULL_MAX_CHANGES = 500;

/**
 * GET /sync/pull?since=<cursor>&limit=<n>. `since` là cursor mờ của trang trước (không gửi
 * = kéo từ đầu); `limit` mặc định `SYNC_PULL_MAX_CHANGES`.
 */
export const SyncPullQuerySchema = z.object({
  since: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(SYNC_PULL_MAX_CHANGES).optional(),
});
export type SyncPullQuery = z.infer<typeof SyncPullQuerySchema>;

export const SyncPullResponseSchema = z.object({
  changes: z.array(SyncEventSchema),
  /**
   * Gửi lại ở `since` lần sau. Không có thay đổi mới thì là `since` đã gửi; `null` khi
   * server chưa có gì của user.
   */
  cursor: z.string().nullable(),
  /** Còn thay đổi sau trang này: kéo tiếp ngay với `cursor`. */
  hasMore: z.boolean(),
});
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;
