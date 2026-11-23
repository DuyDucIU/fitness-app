import { z } from 'zod';

/**
 * Routine của user (UC05, SDD 7.1): routine → ngày tập → bài trong ngày. Ghi bằng REST,
 * cần mạng; app giữ bản GET /v1/routines làm cache chỉ đọc trên máy (ADR 0002).
 */

/** Nguồn của routine (ROUTINES.source). MVP chỉ ghi `manual` và `program`. */
export const RoutineSourceSchema = z.enum([
  'manual',
  'program',
  'import_text',
  'import_image',
  'import_video',
]);
export type RoutineSource = z.infer<typeof RoutineSourceSchema>;

const NameSchema = z.string().trim().min(1).max(80);

/** Target của một bài trong ngày tập, không gồm thứ tự và superset. */
const ExerciseTargetShape = z.object({
  exerciseId: z.uuid(),
  targetSets: z.int().min(1).max(20),
  /** Rep range; `null` với bài đo thời gian hoặc quãng đường. */
  repMin: z.int().min(1).max(100).nullable(),
  repMax: z.int().min(1).max(100).nullable(),
  /** Thời gian mỗi set (giây), chỉ cho bài đo thời gian. */
  targetDurationMinS: z.int().min(1).max(3600).nullable(),
  targetDurationMaxS: z.int().min(1).max(3600).nullable(),
  /** Tạ khởi điểm tĩnh user nhập (R8); `null` = set đầu tự chọn. */
  initialWeightKg: z.number().nonnegative().max(1000).nullable(),
  /** Gợi ý set khởi động; `null` = theo luật mặc định. */
  warmupEnabled: z.boolean().nullable(),
  restSeconds: z.int().min(0).max(1800),
});

type RangeFields = Partial<
  Pick<
    z.infer<typeof ExerciseTargetShape>,
    'repMin' | 'repMax' | 'targetDurationMinS' | 'targetDurationMaxS'
  >
>;

/** Hai đầu của một khoảng không được ngược nhau (chỉ kiểm khi có đủ hai đầu). */
function rangesInOrder(value: RangeFields): boolean {
  const ordered = (min?: number | null, max?: number | null) =>
    min == null || max == null || min <= max;
  return (
    ordered(value.repMin, value.repMax) &&
    ordered(value.targetDurationMinS, value.targetDurationMaxS)
  );
}
const RANGE_MESSAGE = { message: 'Khoảng target bị ngược (min > max)' };

export const RoutineExerciseInputSchema = ExerciseTargetShape.refine(
  rangesInOrder,
  RANGE_MESSAGE,
);
export type RoutineExerciseInput = z.infer<typeof RoutineExerciseInputSchema>;

/** ROUTINE_EXERCISES: một bài trong ngày tập. */
export const RoutineExerciseSchema = ExerciseTargetShape.extend({
  id: z.uuid(),
  position: z.int().nonnegative(),
  /** Bài cùng nhóm superset có cùng số; chưa ghi ở MVP (sub-issue của #14). */
  supersetGroup: z.int().nullable(),
});
export type RoutineExercise = z.infer<typeof RoutineExerciseSchema>;

/** ROUTINE_DAYS: một ngày tập, bài sắp theo `position`. */
export const RoutineDaySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  position: z.int().nonnegative(),
  exercises: z.array(RoutineExerciseSchema),
});
export type RoutineDay = z.infer<typeof RoutineDaySchema>;

/** ROUTINES kèm các ngày tập sắp theo `position`. */
export const RoutineSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  source: RoutineSourceSchema,
  /** Id trong YAML của program đã chép ra routine này (UC24). */
  programId: z.string().nullable(),
  /** Routine đang dùng: mỗi user tối đa một. */
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  days: z.array(RoutineDaySchema),
});
export type Routine = z.infer<typeof RoutineSchema>;

/** GET /v1/routines — mọi routine chưa xoá của user, cũ trước mới sau. */
export const RoutinesResponseSchema = z.object({
  routines: z.array(RoutineSchema),
});
export type RoutinesResponse = z.infer<typeof RoutinesResponseSchema>;

/** POST /v1/routines — routine soạn tay (`source = 'manual'`) với các ngày tập rỗng. */
export const CreateRoutineRequestSchema = z.object({
  name: NameSchema,
  /** Đặt làm routine đang dùng (routine đang dùng cũ thôi dùng). */
  isActive: z.boolean(),
  days: z
    .array(z.object({ name: NameSchema }))
    .min(1)
    .max(14),
});
export type CreateRoutineRequest = z.infer<typeof CreateRoutineRequestSchema>;

/** PATCH /v1/routines/:id — đổi tên, hoặc đặt làm routine đang dùng. */
export const UpdateRoutineRequestSchema = z.object({
  name: NameSchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateRoutineRequest = z.infer<typeof UpdateRoutineRequestSchema>;

/**
 * POST /v1/routine-days/:id/exercises — thêm bài vào ngày tập. `id` do client chọn khi
 * muốn giữ id cũ (hoàn tác xoá); `position` mặc định là cuối ngày.
 */
export const AddRoutineExerciseRequestSchema = ExerciseTargetShape.extend({
  id: z.uuid().optional(),
  position: z.int().nonnegative().optional(),
}).refine(rangesInOrder, RANGE_MESSAGE);
export type AddRoutineExerciseRequest = z.infer<
  typeof AddRoutineExerciseRequestSchema
>;

/** POST /v1/routines/:id/days — thêm ngày tập (kèm bài), mặc định ở cuối routine. */
export const CreateRoutineDayRequestSchema = z.object({
  id: z.uuid().optional(),
  name: NameSchema,
  position: z.int().nonnegative().optional(),
  exercises: z.array(AddRoutineExerciseRequestSchema).max(50),
});
export type CreateRoutineDayRequest = z.infer<
  typeof CreateRoutineDayRequestSchema
>;

/** PATCH /v1/routine-days/:id. */
export const UpdateRoutineDayRequestSchema = z.object({ name: NameSchema });
export type UpdateRoutineDayRequest = z.infer<
  typeof UpdateRoutineDayRequestSchema
>;

/** PATCH /v1/routine-exercises/:id — chỉ gửi các trường đổi (đổi bài thì gửi `exerciseId`). */
export const UpdateRoutineExerciseRequestSchema = ExerciseTargetShape.partial()
  .refine(rangesInOrder, RANGE_MESSAGE)
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Không có trường nào để sửa',
  });
export type UpdateRoutineExerciseRequest = z.infer<
  typeof UpdateRoutineExerciseRequestSchema
>;

/**
 * PUT /v1/routines/:id/day-order và PUT /v1/routine-days/:id/exercise-order: thứ tự mới,
 * phải gồm đúng mọi id hiện có.
 */
export const ReorderRequestSchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Id bị trùng',
    }),
});
export type ReorderRequest = z.infer<typeof ReorderRequestSchema>;

/** Gộp sửa đổi vào target hiện có rồi kiểm lại khoảng (server dùng khi PATCH bài). */
export function targetRangesInOrder(value: RangeFields): boolean {
  return rangesInOrder(value);
}
