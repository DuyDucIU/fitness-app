import { z } from 'zod';

import { UnitPrefSchema } from './common';

/**
 * Bản ghi buổi tập theo ERD (SDD 7.1), đúng hình dạng app lưu trong IndexedDB và đặt vào
 * payload của sự kiện outbox (SDD 3.2). Id là UUID sinh ở client; thời điểm là chuỗi ISO.
 * `updated_at` do server đặt nên không có ở đây. Xoá bằng tombstone `deletedAt`.
 */

/** Quy ước ghi tạ (SRS Phụ lục B — Load input), khớp `LOAD_INPUTS` của engine. */
export const LoadInputSchema = z.enum([
  'total',
  'per_side',
  'per_dumbbell',
  'stack',
  'added_weight',
]);
export type LoadInput = z.infer<typeof LoadInputSchema>;

/** WORKOUT_SESSIONS: một lần tập thật. `routineDayId = null` là tập tự do. */
export const WorkoutSessionSchema = z.object({
  id: z.uuid(),
  routineDayId: z.uuid().nullable(),
  startedAt: z.iso.datetime(),
  /** `null` khi buổi còn đang mở. */
  endedAt: z.iso.datetime().nullable(),
  notes: z.string().nullable(),
  deletedAt: z.iso.datetime().nullable(),
});
export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;

/** SESSION_EXERCISES: một bài trong buổi. */
export const SessionExerciseSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  exerciseId: z.uuid(),
  /** `null` với bài ad hoc (tập tự do, thay bài). */
  routineExerciseId: z.uuid().nullable(),
  /** Quy ước ghi tạ chụp lại lúc thêm bài, để lịch sử không bị hiểu sai khi đổi quy ước. */
  loadInput: LoadInputSchema,
  position: z.int().nonnegative(),
  supersetGroup: z.int().nullable(),
  deletedAt: z.iso.datetime().nullable(),
});
export type SessionExercise = z.infer<typeof SessionExerciseSchema>;

export const SetTypeSchema = z.enum(['warmup', 'working', 'drop', 'failure']);
export type SetType = z.infer<typeof SetTypeSchema>;

/** SET_LOGS: một set đã ghi. Chỉ so sánh tạ trong cùng bài và cùng quy ước ghi tạ. */
export const SetLogSchema = z.object({
  id: z.uuid(),
  sessionExerciseId: z.uuid(),
  /** Thứ tự ghi trong bài; set đã xoá vẫn giữ chỗ. */
  setIndex: z.int().nonnegative(),
  setType: SetTypeSchema,
  /** Đúng con số user nhập, theo `loadInput` của bài và `inputUnit`. */
  weightValue: z.number().nonnegative().nullable(),
  /** Đơn vị lúc ghi; `null` khi set không có tạ (bài chỉ reps). */
  inputUnit: UnitPrefSchema.nullable(),
  reps: z.int().nonnegative().nullable(),
  durationS: z.int().nonnegative().nullable(),
  distanceM: z.number().nonnegative().nullable(),
  rpe: z.number().min(1).max(10).nullable(),
  completedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type SetLog = z.infer<typeof SetLogSchema>;
