import { z } from 'zod';

export const MechanicSchema = z.enum(['compound', 'isolation']);
export type Mechanic = z.infer<typeof MechanicSchema>;

/** Cách ghi số liệu của bài (EXERCISES.metric_type). */
export const MetricTypeSchema = z.enum([
  'weight_reps',
  'reps',
  'duration',
  'distance',
]);
export type MetricType = z.infer<typeof MetricTypeSchema>;

/** Nhóm cơ bài tác động (EXERCISE_MUSCLES nối MUSCLES). */
export const CatalogMuscleSchema = z.object({
  /** Mã chuẩn hoá, vd "lats". */
  code: z.string(),
  nameEn: z.string(),
  nameVi: z.string(),
  /** Nhóm lớn: chest, back, legs… */
  muscleGroup: z.string(),
  role: z.enum(['primary', 'secondary']),
});
export type CatalogMuscle = z.infer<typeof CatalogMuscleSchema>;

/** Tên dùng để tìm bài (EXERCISE_ALIASES). Client tự chuẩn hoá khi tìm. */
export const CatalogAliasSchema = z.object({
  alias: z.string(),
  lang: z.enum(['vi', 'en']),
  /** Alias user tự đặt (ưu tiên trước alias chung khi tìm, UC03). */
  mine: z.boolean(),
});
export type CatalogAlias = z.infer<typeof CatalogAliasSchema>;

export const CatalogExerciseSchema = z.object({
  id: z.uuid(),
  nameEn: z.string(),
  /** Bài tuỳ chỉnh có thể chưa có tên Việt. */
  nameVi: z.string().nullable(),
  /** Mã dụng cụ theo free-exercise-db, vd "barbell", "body only". */
  equipment: z.string().nullable(),
  mechanic: MechanicSchema.nullable(),
  metricType: MetricTypeSchema,
  /** Bài tuỳ chỉnh của user (UC04), không thuộc catalog chung. */
  mine: z.boolean(),
  /** Bài đã lưu trữ: không hiện khi tìm, vẫn giữ để đọc tên ở lịch sử. */
  isArchived: z.boolean(),
  muscles: z.array(CatalogMuscleSchema),
  aliases: z.array(CatalogAliasSchema),
});
export type CatalogExercise = z.infer<typeof CatalogExerciseSchema>;

/**
 * GET /v1/catalog — toàn bộ catalog user thấy: catalog chung cộng bài tuỳ chỉnh của user,
 * alias chung cộng alias của user. App giữ bản này làm cache chỉ đọc trên máy (ADR 0002).
 */
export const CatalogResponseSchema = z.object({
  exercises: z.array(CatalogExerciseSchema),
});
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;
