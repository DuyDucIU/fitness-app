import { z } from 'zod';

/**
 * SUGGESTIONS (UC12, UC13; SDD 7.1): gợi ý của progression engine kèm trạng thái user trả
 * lời. Local-first qua outbox như dữ liệu buổi tập (ADR 0002): id là UUID sinh ở client,
 * `updated_at` do server đặt nên không có ở đây, xoá bằng tombstone `deletedAt`.
 */

/** Năm loại gợi ý (PRODUCT.md › thuật ngữ). */
export const SuggestionKindSchema = z.enum([
  'increase',
  'celebrate',
  'back_off',
  'return_from_break',
  'deload',
]);
export type SuggestionKind = z.infer<typeof SuggestionKindSchema>;

export const SuggestionStrengthSchema = z.enum(['soft', 'strong']);
export type SuggestionStrength = z.infer<typeof SuggestionStrengthSchema>;

/**
 * `pending`: đã đưa ra, chưa trả lời; `accepted` / `dismissed`: user nhận hay bỏ qua;
 * `expired`: buổi kết thúc mà chưa trả lời. Tỉ lệ chấp nhận tính trên cột này.
 */
export const SuggestionStatusSchema = z.enum([
  'pending',
  'accepted',
  'dismissed',
  'expired',
]);
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

export const SuggestionSchema = z.object({
  id: z.uuid(),
  /** Bài được gợi ý, kể cả bài ad hoc (không có `routineExerciseId`). */
  exerciseId: z.uuid(),
  /** Bài trong ngày tập; `null` với bài ad hoc. */
  routineExerciseId: z.uuid().nullable(),
  /** Bài trong buổi mà gợi ý đưa ra giữa chừng (UC13); `null` = gợi ý trước buổi. */
  sessionExerciseId: z.uuid().nullable(),
  /**
   * Bài trong buổi đã ghi làm căn cứ (lần tập gần nhất của bài): cùng căn cứ là cùng một
   * gợi ý, nên mở lại Today hay vào buổi không tạo gợi ý thứ hai.
   */
  basedOnSessionExerciseId: z.uuid().nullable(),
  kind: SuggestionKindSchema,
  strength: SuggestionStrengthSchema,
  /**
   * Mã lý do engine trả về (vd `all_sets_top`); câu chữ dựng ở client theo ngôn ngữ của
   * user. Để chuỗi tự do để client cũ không từ chối mã của luật mới.
   */
  reason: z.string().min(1).max(64),
  /** Tham số của lý do (số set, trần rep range, mức tạ…). */
  payload: z.record(
    z.string(),
    z.union([z.number(), z.string(), z.boolean(), z.null()]),
  ),
  status: SuggestionStatusSchema,
  createdAt: z.iso.datetime(),
  respondedAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;
