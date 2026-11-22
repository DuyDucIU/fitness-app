/**
 * Rest timer (UC08, SDD 3.3). Timer lưu **mốc thời điểm kết thúc** chứ không đếm tick,
 * nên sau khi app nằm nền (trình duyệt dừng JS) vẫn tính đúng thời gian còn lại. Không
 * đọc đồng hồ hệ thống: thời điểm hiện tại (ms) truyền vào qua tham số.
 */

/**
 * Thời gian nghỉ khi bài không thuộc routine (bài ad hoc, tập tự do). SRS chưa chốt số
 * này; lấy theo prototype (`plan.rest ?? 120`).
 */
export const DEFAULT_REST_SECONDS = 120;

/** Một lượt nghỉ đang chạy: mốc kết thúc và tổng thời lượng (ms), để vẽ lớp nghỉ. */
export interface RestTimer {
  endsAt: number;
  totalMs: number;
}

/** Thời gian còn lại của lượt nghỉ tại một thời điểm. */
export interface RestLeft {
  /** Số giây còn lại, làm tròn lên: chỉ hiện 0:00 khi đã hết. */
  seconds: number;
  /** Phần còn lại trên tổng (1 → 0), là độ dài lớp nghỉ trên dải số áo. */
  fraction: number;
  done: boolean;
}

/** Thời lượng nghỉ: `rest_seconds` của bài trong routine, không có thì mặc định. */
export function restSecondsFor(routineRestSeconds: number | null): number {
  return routineRestSeconds ?? DEFAULT_REST_SECONDS;
}

export function startRest(seconds: number, now: number): RestTimer {
  return { endsAt: now + seconds * 1000, totalMs: seconds * 1000 };
}

/** Cộng thêm thời gian nghỉ: dời cả mốc kết thúc lẫn tổng, để lớp nghỉ không giật. */
export function addRest(timer: RestTimer, seconds: number): RestTimer {
  return {
    endsAt: timer.endsAt + seconds * 1000,
    totalMs: timer.totalMs + seconds * 1000,
  };
}

export function restLeft(timer: RestTimer, now: number): RestLeft {
  // Kẹp trong [0, tổng]: màn hình có thể giữ "bây giờ" cũ hơn lúc bắt đầu nghỉ một nhịp.
  const ms = Math.min(timer.totalMs, Math.max(0, timer.endsAt - now));
  return {
    seconds: Math.ceil(ms / 1000),
    fraction: timer.totalMs > 0 ? ms / timer.totalMs : 0,
    done: ms === 0,
  };
}
