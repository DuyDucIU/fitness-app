import { z } from 'zod';

/**
 * Chỉ số cơ thể nhập tay (UC18, SDD 7.1 `BODY_METRICS`): ghi bằng REST, cần mạng (ADR 0002);
 * app không cache trên máy. Cân nặng lưu bằng kg, vòng eo bằng cm, body fat bằng %.
 */

export const BODY_METRICS = ['weight', 'waist', 'body_fat'] as const;
export const BodyMetricKindSchema = z.enum(BODY_METRICS);
export type BodyMetricKind = z.infer<typeof BodyMetricKindSchema>;

/** `health_connect` là post-MVP (UC29), chưa ghi. */
export const BodyMetricSourceSchema = z.enum(['manual', 'health_connect']);
export type BodyMetricSource = z.infer<typeof BodyMetricSourceSchema>;

/**
 * Khoảng hợp lệ, tính cả hai đầu, theo đơn vị lưu. Không để chấm sức khoẻ, chỉ để bắt gõ nhầm
 * và nhầm đơn vị: vòng eo dưới 50 thường là inch, body fat dưới 2 thường là phân số (0,18).
 */
export const BODY_METRIC_RANGES: Record<
  BodyMetricKind,
  { min: number; max: number }
> = {
  weight: { min: 25, max: 350 },
  waist: { min: 50, max: 250 },
  body_fat: { min: 2, max: 60 },
};

export function isBodyMetricValueValid(
  metric: BodyMetricKind,
  value: number,
): boolean {
  const { min, max } = BODY_METRIC_RANGES[metric];
  return Number.isFinite(value) && value >= min && value <= max;
}

export const BodyMetricSchema = z.object({
  id: z.uuid(),
  metric: BodyMetricKindSchema,
  value: z.number(),
  measuredAt: z.iso.datetime(),
  source: BodyMetricSourceSchema,
  /** Đã sửa số hoặc thời điểm sau khi nhập. */
  edited: z.boolean(),
});
export type BodyMetric = z.infer<typeof BodyMetricSchema>;

/** GET /v1/body-metrics: mọi chỉ số của user, mới đo trước. */
export const BodyMetricsResponseSchema = z.object({
  entries: z.array(BodyMetricSchema),
});
export type BodyMetricsResponse = z.infer<typeof BodyMetricsResponseSchema>;

const ValueSchema = z.number().finite();

/** POST /v1/body-metrics. */
export const CreateBodyMetricRequestSchema = z
  .object({
    metric: BodyMetricKindSchema,
    value: ValueSchema,
    measuredAt: z.iso.datetime(),
  })
  .refine((b) => isBodyMetricValueValid(b.metric, b.value), {
    message: 'Số nằm ngoài khoảng hợp lệ của chỉ số',
    path: ['value'],
  });
export type CreateBodyMetricRequest = z.infer<
  typeof CreateBodyMetricRequestSchema
>;

/**
 * PATCH /v1/body-metrics/:id: đổi số hoặc thời điểm, không đổi loại chỉ số. Khoảng hợp lệ của
 * số kiểm ở server theo loại của bản ghi (`isBodyMetricValueValid`).
 */
export const UpdateBodyMetricRequestSchema = z
  .object({
    value: ValueSchema.optional(),
    measuredAt: z.iso.datetime().optional(),
  })
  .refine((b) => b.value !== undefined || b.measuredAt !== undefined, {
    message: 'Cần ít nhất một field để sửa',
  });
export type UpdateBodyMetricRequest = z.infer<
  typeof UpdateBodyMetricRequestSchema
>;
