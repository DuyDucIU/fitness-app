import { z } from 'zod';

/** Đơn vị hiển thị (USERS.unit_pref). */
export const UnitPrefSchema = z.enum(['kg', 'lb']);
export type UnitPref = z.infer<typeof UnitPrefSchema>;

/** Response lỗi thống nhất cho mọi endpoint (SDD 8.1). */
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
