import { z } from 'zod';

/** Đơn vị hiển thị (USERS.unit_pref). */
export const UnitPrefSchema = z.enum(['kg', 'lb']);
export type UnitPref = z.infer<typeof UnitPrefSchema>;

/** Ngôn ngữ giao diện (USERS.locale, D27). Tiếng Anh là mặc định. */
export const LocaleSchema = z.enum(['en', 'vi']);
export type Locale = z.infer<typeof LocaleSchema>;

/**
 * Response lỗi thống nhất cho mọi endpoint (SDD 8.1). Client hiển thị theo `code`
 * (message đã dịch `error_<code>`); `message` chỉ để debug, không hiển thị cho user.
 */
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
