import { z } from 'zod';

/** Chuỗi rỗng trong .env coi như không đặt. */
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  /** URL project Supabase, vd https://xxxx.supabase.co */
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  /** Chỉ cần khi project Supabase dùng JWT secret chung (HS256). */
  SUPABASE_JWT_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  /**
   * Origin của web app được phép gọi API (CORS), cách nhau bằng dấu phẩy (SDD 4.4).
   * Mặc định: Vite dev server (5173) và vite preview (4173, để thử service worker).
   */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:4173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url())),
});
export type Env = z.infer<typeof EnvSchema>;

/** Dùng cho ConfigModule.forRoot({ validate }) — báo lỗi rõ khi thiếu biến. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Biến môi trường không hợp lệ:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
