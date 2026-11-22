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

/**
 * Các buổi đã kết thúc, mới nhất trước, tự cập nhật khi dữ liệu đổi (kể cả khi kéo về).
 * `undefined` khi đang đọc IndexedDB.
 */
export function useHistory(): Workout[] | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.workoutSessions
      .orderBy('startedAt')
      .reverse()
      .filter(isFinished)
      .toArray();
    return Promise.all(sessions.map(readWorkout));
  }, []);
}

/**
 * Một buổi đã kết thúc theo id. `undefined` khi đang đọc; `null` khi không có (sai id, đã
 * xoá, chưa kết thúc).
 */
export function useFinishedWorkout(id: string): Workout | null | undefined {
  return useLiveQuery(async () => {
    const session = await db.workoutSessions.get(id);
    return session && isFinished(session) ? readWorkout(session) : null;
  }, [id]);
}
