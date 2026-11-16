import { z } from 'zod';
import { parse } from 'yaml';

/** Một bài trong ngày tập. `exercise` là id của bài trong catalog (free-exercise-db). */
export const TemplateExerciseSchema = z
  .object({
    exercise: z.string().min(1),
    sets: z.number().int().positive(),
    repMin: z.number().int().positive(),
    repMax: z.number().int().positive(),
    restSeconds: z.number().int().positive().optional(),
    /** R8: chỉ dùng tạ khởi điểm tĩnh từ template, không có thuật toán gợi ý. */
    initialWeightKg: z.number().positive().optional(),
  })
  .refine((e) => e.repMin <= e.repMax, { message: 'repMin must be <= repMax' });

export const TemplateDaySchema = z.object({
  name: z.string().min(1),
  exercises: z.array(TemplateExerciseSchema).min(1),
});

/** Chương trình mẫu (UC24), lọc theo USER_PROFILES. */
export const ProgramTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  experienceLevel: z.enum(['beginner', 'experienced']),
  daysPerWeek: z.number().int().min(1).max(7),
  equipmentAccess: z.enum(['gym', 'home']),
  goal: z.enum(['general', 'hypertrophy', 'fat_loss']),
  /** true = nội dung chưa được founder duyệt qua PR. */
  draft: z.boolean().default(true),
  days: z.array(TemplateDaySchema).min(1),
});
export type ProgramTemplate = z.infer<typeof ProgramTemplateSchema>;

/** Parse và validate nội dung một file YAML chương trình mẫu. */
export function parseProgramTemplate(yamlText: string): ProgramTemplate {
  return ProgramTemplateSchema.parse(parse(yamlText));
}
