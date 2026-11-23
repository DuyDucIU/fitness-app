/**
 * Ngày tập kế tiếp của routine đang dùng (UC06): ngày đứng sau ngày của buổi gần nhất
 * theo routine này, quay vòng về ngày đầu. Buổi tập tự do, buổi của routine khác hay của
 * ngày đã xoá không làm lệch vòng nên bị bỏ qua; buổi đã xoá không tính.
 */

/** Phần của buổi tập mà luật xoay vòng cần. */
export interface RotationSession {
  routineDayId: string | null;
  /** Chuỗi ISO, so sánh được theo thứ tự chữ. */
  startedAt: string;
  deletedAt: string | null;
}

/**
 * Chỉ số (từ 0) trong `dayIds` của ngày thuộc buổi gần nhất theo routine; `null` khi chưa
 * có buổi nào theo routine này.
 */
export function lastDayIndex(
  dayIds: readonly string[],
  sessions: readonly RotationSession[],
): number | null {
  let last: { index: number; startedAt: string } | null = null;
  for (const s of sessions) {
    if (s.deletedAt !== null || s.routineDayId === null) continue;
    const index = dayIds.indexOf(s.routineDayId);
    if (index < 0) continue;
    if (!last || s.startedAt > last.startedAt) {
      last = { index, startedAt: s.startedAt };
    }
  }
  return last?.index ?? null;
}

/**
 * Chỉ số (từ 0) của ngày kế tiếp trong `dayIds` (đã xếp theo thứ tự routine). Chưa có buổi
 * nào theo routine thì là ngày đầu; routine không có ngày thì `-1`.
 */
export function nextDayIndex(
  dayIds: readonly string[],
  sessions: readonly RotationSession[],
): number {
  if (dayIds.length === 0) return -1;
  const last = lastDayIndex(dayIds, sessions);
  return last === null ? 0 : (last + 1) % dayIds.length;
}
