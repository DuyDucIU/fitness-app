import { z } from 'zod';
import { LocaleSchema, UnitPrefSchema } from './common';

/** GET /v1/me — user hiện tại; lần đầu gọi sẽ tạo bản ghi USERS (UC01 bước 3). */
export const MeResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  unitPref: UnitPrefSchema,
  locale: LocaleSchema,
  timezone: z.string(),
  rpeEnabled: z.boolean(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
