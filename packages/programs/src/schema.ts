import { z } from 'zod';
import { parse } from 'yaml';

/** Chữ hiển thị song ngữ (D27, SDD 3.5): tiếng Anh là bản gốc, tiếng Việt là bản dịch. */
export const LocalizedTextSchema = z.object({
  en: z.string().min(1),
  vi: z.string().min(1),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

/** Một bài trong ngày tập. `exercise` là id của bài trong catalog (free-exercise-db). */
export const ProgramExerciseSchema = z
  .object({
    exercise: z.string().min(1),
    sets: z.number().int().positive(),
    repMin: z.number().int().positive(),
    repMax: z.number().int().positive(),
    restSeconds: z.number().int().positive().optional(),
    /** R8: chỉ dùng tạ khởi điểm tĩnh từ program, không có thuật toán gợi ý. */
    initialWeightKg: z.number().positive().optional(),
  })
  .refine((e) => e.repMin <= e.repMax, { message: 'repMin must be <= repMax' });

export const ProgramDaySchema = z.object({
  name: LocalizedTextSchema,
  exercises: z.array(ProgramExerciseSchema).min(1),
});

/** Chương trình mẫu (UC24), lọc theo USER_PROFILES. */
export const ProgramSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  experienceLevel: z.enum(['beginner', 'experienced']),
  daysPerWeek: z.number().int().min(1).max(7),
  equipmentAccess: z.enum(['gym', 'home']),
  goal: z.enum(['general', 'hypertrophy', 'fat_loss']),
  /** true = nội dung chưa được founder duyệt qua PR. */
  draft: z.boolean().default(true),
  days: z.array(ProgramDaySchema).min(1),
});
export type Program = z.infer<typeof ProgramSchema>;

/** Parse và validate nội dung một file YAML chương trình mẫu. */
export function parseProgram(yamlText: string): Program {
  return ProgramSchema.parse(parse(yamlText));
}
