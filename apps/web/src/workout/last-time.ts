import type { LastTime } from '@fitness/engine';

import { db } from '@/db/db';

/**
 * Lần tập gần nhất của một bài trên máy (UC07 bước 2): buổi đã kết thúc, chưa xoá, mới
 * nhất có ít nhất một working set chưa xoá của bài đó. Bỏ qua buổi đang mở. Trả về dữ
 * liệu thuần để engine dùng lại; `null` khi bài chưa có lịch sử.
 */
export async function findLastTime(
  exerciseId: string,
): Promise<LastTime | null> {
  const rows = (
    await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()
  ).filter((r) => r.deletedAt === null);
  if (rows.length === 0) return null;
  const sessions = await db.workoutSessions.bulkGet(
    rows.map((r) => r.sessionId),
  );
  const candidates = rows
    .map((row, i) => ({ row, session: sessions[i] }))
    .filter(
      (c) => c.session && c.session.endedAt !== null && !c.session.deletedAt,
    )
    .sort(
      (a, b) =>
        Date.parse(b.session!.startedAt) - Date.parse(a.session!.startedAt),
    );
  for (const { row, session } of candidates) {
    const sets = (
      await db.setLogs.where('sessionExerciseId').equals(row.id).toArray()
    )
      .filter((s) => s.setType === 'working' && s.deletedAt === null)
      .sort((a, b) => a.setIndex - b.setIndex);
    if (sets.length === 0) continue;
    return {
      startedAt: session!.startedAt,
      loadInput: row.loadInput,
      sets: sets.map((s) => ({ weight: s.weightValue, reps: s.reps })),
    };
  }
  return null;
}
