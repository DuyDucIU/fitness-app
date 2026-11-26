import { z } from 'zod';
import { LoadInputSchema } from './workout';

/**
 * Biểu đồ tiến độ (UC19): GET /v1/progress. Server tổng hợp từ buổi đã đồng bộ, cần mạng
 * để xem. Tuần ISO (thứ Hai – Chủ nhật) và tháng theo múi giờ của user; buổi thuộc tuần
 * và tháng của ngày kết thúc.
 */

/** Nhóm cơ lớn (`MUSCLES.muscle_group`, seed catalog), theo thứ tự hiển thị. */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'neck',
] as const;
export const MuscleGroupSchema = z.enum(MUSCLE_GROUPS);
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>;

/** Số tuần trả về: 12 tuần hiển thị cùng 4 tuần trước đó để tính trung bình. */
export const PROGRESS_WEEKS = 16;
/** Số tháng trả về, tính cả tháng này. */
export const PROGRESS_MONTHS = 12;

const LocalDateSchema = z.iso.date();

export const ProgressWeekSchema = z.object({
  /** Thứ Hai đầu tuần. */
  start: LocalDateSchema,
  workouts: z.int().nonnegative(),
  /** Working set theo nhóm cơ; cơ phụ tính nửa set, nên có thể lẻ ,5. */
  sets: z.record(MuscleGroupSchema, z.number().nonnegative()),
});
export type ProgressWeek = z.infer<typeof ProgressWeekSchema>;

export const ProgressMonthSchema = z.object({
  /** Ngày 1 của tháng. */
  start: LocalDateSchema,
  workouts: z.int().nonnegative(),
});
export type ProgressMonth = z.infer<typeof ProgressMonthSchema>;

/** Điểm e1RM của một buổi (Epley), từ set có e1RM cao nhất trong các set tối đa 12 reps. */
export const E1rmPointSchema = z.object({
  sessionId: z.uuid(),
  date: LocalDateSchema,
  e1rmKg: z.number().positive(),
  weightKg: z.number().positive(),
  reps: z.int().positive(),
});
export type E1rmPoint = z.infer<typeof E1rmPointSchema>;

/** Một đường e1RM: một bài với một cách ghi tạ, không gộp các cách ghi (D15). */
export const E1rmSeriesSchema = z.object({
  exerciseId: z.uuid(),
  loadInput: LoadInputSchema,
  /** Từ cũ tới mới, toàn bộ lịch sử; màn hình tự lọc theo khoảng đang xem. */
  points: z.array(E1rmPointSchema),
});
export type E1rmSeries = z.infer<typeof E1rmSeriesSchema>;

export const ProgressResponseSchema = z.object({
  /** Hôm nay theo múi giờ của user. */
  today: LocalDateSchema,
  /** `PROGRESS_WEEKS` tuần từ cũ tới mới; tuần cuối là tuần này. */
  weeks: z.array(ProgressWeekSchema),
  /** `PROGRESS_MONTHS` tháng từ cũ tới mới; tháng cuối là tháng này. */
  months: z.array(ProgressMonthSchema),
  e1rm: z.array(E1rmSeriesSchema),
});
export type ProgressResponse = z.infer<typeof ProgressResponseSchema>;
