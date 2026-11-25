/**
 * Các ngưỡng số của progression engine (SRS Phụ lục A), chốt làm mặc định cho MVP, chỉnh
 * lại sau nếu cần.
 */
export const ENGINE_DEFAULTS = {
  /** R3: set đúng sàn rep range với RPE từ mức này trở lên cũng back-off (DESIGN.md › RPE). */
  backOffRpe: 10,
} as const;
