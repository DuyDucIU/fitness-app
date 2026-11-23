import type { Routine, RoutineDay } from '@fitness/contract';
import { lastDayIndex, nextDayIndex } from '@fitness/engine';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/db/db';

/** Buổi gần nhất đã kết thúc theo một ngày tập. */
export interface DayLast {
  startedAt: string;
  /** Số phút từ lúc bắt đầu tới lúc kết thúc. */
  minutes: number;
}

/** Routine đang dùng cùng vòng ngày tập (UC06), đọc từ cache trên máy. */
export interface ActiveRoutine {
  routine: Routine;
  /** Chỉ số ngày kế tiếp trong `routine.days`; `-1` khi routine không có ngày. */
  next: number;
  /** Chỉ số ngày của buổi gần nhất theo routine; `null` khi chưa tập buổi nào theo nó. */
  last: number | null;
  /** Buổi đã kết thúc gần nhất của từng ngày, theo id ngày. */
  lastByDay: Map<string, DayLast>;
}

/** Ngày tập của routine theo thứ tự xoay vòng: ngày kế tiếp đứng đầu. */
export function rotatedDays(active: ActiveRoutine): RoutineDay[] {
  const { days } = active.routine;
  const start = Math.max(0, active.next);
  return [...days.slice(start), ...days.slice(0, start)];
}

/**
 * Routine đang dùng và ngày kế tiếp, tự cập nhật khi cache routine hay buổi tập đổi.
 * `undefined` khi đang đọc; `null` khi không có routine đang dùng (kèm `hasRoutines` để
 * phân biệt chưa có routine nào với có mà chưa đặt cái nào đang dùng).
 */
export function useActiveRoutine():
  { active: ActiveRoutine | null; hasRoutines: boolean } | undefined {
  return useLiveQuery(async () => {
    const routines = await db.routines.toArray();
    const routine = routines.find((r) => r.isActive);
    if (!routine) return { active: null, hasRoutines: routines.length > 0 };
    const sessions = await db.workoutSessions.toArray();
    const dayIds = routine.days.map((d) => d.id);
    const lastByDay = new Map<string, DayLast>();
    for (const s of sessions) {
      if (!s.routineDayId || s.endedAt === null || s.deletedAt !== null)
        continue;
      const known = lastByDay.get(s.routineDayId);
      if (known && known.startedAt >= s.startedAt) continue;
      lastByDay.set(s.routineDayId, {
        startedAt: s.startedAt,
        minutes: Math.max(
          0,
          Math.round(
            (Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60_000,
          ),
        ),
      });
    }
    return {
      active: {
        routine,
        next: nextDayIndex(dayIds, sessions),
        last: lastDayIndex(dayIds, sessions),
        lastByDay,
      },
      hasRoutines: true,
    };
  }, []);
}
