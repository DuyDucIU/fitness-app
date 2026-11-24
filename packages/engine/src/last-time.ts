import type { LoadInput } from './equipment';

/**
 * Một working set đã ghi: `weight = null` với bài chỉ reps; `durationS` chỉ có với bài
 * đo thời gian.
 */
export interface PastSet {
  weight: number | null;
  reps: number | null;
  durationS: number | null;
}

/**
 * Lần tập gần nhất của một bài (UC07 bước 2): buổi đã kết thúc, chưa xoá, mới nhất có
 * ít nhất một working set của bài đó. Dữ liệu thuần để các luật gợi ý dùng lại.
 */
export interface LastTime {
  /** Bài trong buổi đó: căn cứ của gợi ý dựa trên lần này. */
  sessionExerciseId: string;
  /** Giờ bắt đầu buổi đó (ISO). */
  startedAt: string;
  /** Quy ước ghi tạ của bài trong buổi đó. */
  loadInput: LoadInput;
  /** Các working set theo thứ tự ghi. */
  sets: PastSet[];
}

/**
 * Số điền sẵn cho working set thứ `setIndex` (từ 0) theo lần trước (UC07 bước 3):
 * đúng set cùng thứ tự, set dư thì lấy set cuối. Không điền (`null`) khi chưa có lịch
 * sử (R8) hoặc lần trước ghi tạ theo quy ước khác, vì con số không còn cùng nghĩa.
 *
 * Hàm thuần: không đọc đồng hồ, không gọi mạng.
 */
export function prefillFromLast(
  last: LastTime | null,
  setIndex: number,
  loadInput: LoadInput,
): PastSet | null {
  if (!last || last.loadInput !== loadInput) return null;
  return last.sets[setIndex] ?? last.sets.at(-1) ?? null;
}
