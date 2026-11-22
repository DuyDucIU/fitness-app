import type { WorkoutSession } from '@fitness/contract';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/db/db';
import { readWorkout, type Workout } from '@/workout/session';

/**
 * Lịch sử buổi tập trên máy (UC20 bước 1–2): buổi ghi trên máy này và buổi kéo về từ
 * server (`sync/pull`). Chỉ gồm buổi đã kết thúc, chưa xoá (tombstone).
 */

const isFinished = (s: WorkoutSession) =>
  s.endedAt !== null && s.deletedAt === null;

/** Một buổi đã kết thúc trong lịch sử, kèm số liệu để hiển thị. */
export interface HistoryWorkout extends Workout {
  /** Số set working (không tính khởi động, drop…). */
  workingSets: number;
  /** Số phút từ lúc bắt đầu tới lúc kết thúc. */
  minutes: number;
  /** Còn thay đổi chưa lên server (chờ đẩy hoặc bị server từ chối). */
  unsynced: boolean;
}

/** Một tuần (thứ Hai – Chủ nhật, giờ trên máy) có buổi tập, buổi mới nhất trước. */
export interface HistoryWeek {
  /** 0 giờ thứ Hai đầu tuần. */
  start: Date;
  /** 0 giờ Chủ nhật cuối tuần. */
  end: Date;
  workouts: HistoryWorkout[];
}

/** 0 giờ thứ Hai của tuần chứa `date` (giờ trên máy). */
export function weekStart(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

/** Nhóm các buổi (đã xếp mới nhất trước) theo tuần, tuần mới nhất trước. */
export function groupByWeek(workouts: HistoryWorkout[]): HistoryWeek[] {
  const weeks: HistoryWeek[] = [];
  for (const workout of workouts) {
    const start = weekStart(new Date(workout.session.startedAt));
    let week = weeks.at(-1);
    if (week?.start.getTime() !== start.getTime()) {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      week = { start, end, workouts: [] };
      weeks.push(week);
    }
    week.workouts.push(workout);
  }
  return weeks;
}

/** Id của các bản ghi còn thay đổi chưa lên server (outbox hoặc bị từ chối). */
async function unsyncedIds(): Promise<Set<string>> {
  const [pending, rejected] = await Promise.all([
    db.outbox.toArray(),
    db.syncRejects.toArray(),
  ]);
  return new Set([
    ...pending.map((e) => e.entityId),
    ...rejected.map((r) => r.event.entityId),
  ]);
}

function toHistoryWorkout(
  workout: Workout,
  unsynced: Set<string>,
): HistoryWorkout {
  const { session, exercises } = workout;
  const sets = exercises.flatMap((e) => e.sets);
  const ids = [
    session.id,
    ...exercises.map((e) => e.row.id),
    ...sets.map((s) => s.id),
  ];
  return {
    ...workout,
    workingSets: sets.filter((s) => s.setType === 'working').length,
    minutes: Math.max(
      0,
      Math.round(
        (Date.parse(session.endedAt ?? session.startedAt) -
          Date.parse(session.startedAt)) /
          60_000,
      ),
    ),
    unsynced: ids.some((id) => unsynced.has(id)),
  };
}

/**
 * Các buổi đã kết thúc, mới nhất trước, tự cập nhật khi dữ liệu đổi (kể cả khi kéo về).
 * `undefined` khi đang đọc IndexedDB.
 */
export function useHistory(): HistoryWorkout[] | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.workoutSessions
      .orderBy('startedAt')
      .reverse()
      .filter(isFinished)
      .toArray();
    const [workouts, unsynced] = await Promise.all([
      Promise.all(sessions.map(readWorkout)),
      unsyncedIds(),
    ]);
    return workouts.map((w) => toHistoryWorkout(w, unsynced));
  }, []);
}

/**
 * Một buổi đã kết thúc theo id. `undefined` khi đang đọc; `null` khi không có (sai id, đã
 * xoá, chưa kết thúc).
 */
export function useFinishedWorkout(
  id: string,
): HistoryWorkout | null | undefined {
  return useLiveQuery(async () => {
    const session = await db.workoutSessions.get(id);
    if (!session || !isFinished(session)) return null;
    return toHistoryWorkout(await readWorkout(session), await unsyncedIds());
  }, [id]);
}
