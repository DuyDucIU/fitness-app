import { z } from 'zod';

import { LoadInputSchema } from './workout';

/**
 * USER_EXERCISE_SETTINGS (SDD 7.1; UC08, UC14): cài đặt riêng của user cho một bài. Khoá là
 * user × bài nên bản ghi không có `id`; app ghi cả dòng qua outbox, server upsert theo khoá
 * ghép (last-write-wins). Bài chưa có dòng nào thì dùng mặc định theo dụng cụ.
 */
export const ExerciseSettingSchema = z.object({
  exerciseId: z.uuid(),
  /** Bậc tạ (kg) cho nút −/+ và các gợi ý có số. */
  weightStepKg: z.number().positive().max(50),
  /** Quy ước ghi tạ cho các buổi sau; bài trong buổi đã chụp quy ước riêng. */
  loadInput: LoadInputSchema,
  /** Trọng lượng đòn (kg); `null` khi không có đòn. */
  barWeightKg: z.number().nonnegative().max(100).nullable(),
  /** Tự chạy rest timer sau mỗi set (UC08). */
  restAutoStart: z.boolean(),
});
export type ExerciseSetting = z.infer<typeof ExerciseSettingSchema>;
