import type { WorkoutSession } from '@fitness/contract';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/db/db';
import { weekStart } from '@/workout/history';

/**
 * Tuần này trên dải tuần của Today (prototypes/home › .week): ngày nào đã tập, theo giờ
 * trên máy, tuần từ thứ Hai. Mục tiêu số buổi và streak thuộc #36/#37.
 */

export interface WeekDay {
  /** 0 giờ của ngày (giờ trên máy). */
  date: Date;
  /** Có ít nhất một buổi chưa xoá bắt đầu trong ngày (kể cả buổi đang mở). */
  trained: boolean;
  today: boolean;
}

export interface ThisWeek {
  /** Bảy ngày, thứ Hai trước. */
  days: WeekDay[];
  /** Số buổi chưa xoá bắt đầu trong tuần. */
  count: number;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Tuần chứa `today` và các buổi trong đó. */
export function thisWeek(
  sessions: Pick<WorkoutSession, 'startedAt' | 'deletedAt'>[],
  today: Date,
): ThisWeek {
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
  const end = new Date(days[6]);
  end.setDate(end.getDate() + 1);
  const inWeek = sessions
    .filter((s) => s.deletedAt === null)
    .map((s) => new Date(s.startedAt))
    .filter((d) => d >= start && d < end);
  return {
    days: days.map((date) => ({
      date,
      trained: inWeek.some((d) => sameDay(d, date)),
      today: sameDay(date, today),
    })),
    count: inWeek.length,
  };
}

/** Tuần này theo dữ liệu trên máy, tự cập nhật. `undefined` khi đang đọc. */
export function useThisWeek(today: Date): ThisWeek | undefined {
  const key = today.toDateString();
  return useLiveQuery(
    async () => thisWeek(await db.workoutSessions.toArray(), today),
    // Chỉ đọc lại khi sang ngày khác, không theo từng lần render.
    [key],
  );
}
