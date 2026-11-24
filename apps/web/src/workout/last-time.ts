import type { RoutineExercise } from '@fitness/contract';
import type { LastTime, PastSession } from '@fitness/engine';

import { db } from '@/db/db';

/**
 * Các lần tập gần nhất của một bài trên máy (UC07 bước 2, UC12), mới nhất trước: buổi đã
 * kết thúc, chưa xoá, có ít nhất một working set chưa xoá của bài đó. Bỏ qua buổi đang mở.
 * Mỗi lần kèm target của bài trong ngày tập lúc đó, tra trong cache routine (`null`: bài
 * ad hoc, hoặc bài đã bị xoá khỏi ngày tập). Trả về dữ liệu thuần để engine dùng lại.
 */
export async function findHistory(
  exerciseId: string,
  limit = Infinity,
): Promise<PastSession[]> {
  const rows = (
    await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()
  ).filter((r) => r.deletedAt === null);
  if (rows.length === 0) return [];
  const sessions = await db.workoutSessions.bulkGet(
    rows.map((r) => r.sessionId),
  );
  const candidates = rows
    .flatMap((row, i) => {
      const session = sessions[i];
      return session && session.endedAt !== null && !session.deletedAt
        ? [{ row, session }]
        : [];
    })
    .sort(
      (a, b) =>
        Date.parse(b.session.startedAt) - Date.parse(a.session.startedAt),
    );
  const history: PastSession[] = [];
  const seen = new Set<string>();
  let targets: Map<string, RoutineExercise> | undefined;
  for (const { row, session } of candidates) {
    if (history.length >= limit) break;
    // Một buổi có cùng bài hai lần vẫn chỉ là một lần tập (R2 so hai buổi khác nhau).
    if (seen.has(session.id)) continue;
    const sets = (
      await db.setLogs.where('sessionExerciseId').equals(row.id).toArray()
    )
      .filter((s) => s.setType === 'working' && s.deletedAt === null)
      .sort((a, b) => a.setIndex - b.setIndex);
    if (sets.length === 0) continue;
    seen.add(session.id);
    targets ??= await routineTargets();
    history.push({
      sessionExerciseId: row.id,
      startedAt: session.startedAt,
      loadInput: row.loadInput,
      sets: sets.map((s) => ({
        weight: s.weightValue,
        reps: s.reps,
        durationS: s.durationS,
      })),
      target: row.routineExerciseId
        ? (targets.get(row.routineExerciseId) ?? null)
        : null,
    });
  }
  return history;
}

/** Mọi bài trong ngày tập của mọi routine trên máy, theo id. */
async function routineTargets(): Promise<Map<string, RoutineExercise>> {
  const routines = await db.routines.toArray();
  return new Map(
    routines.flatMap((r) =>
      r.days.flatMap((d) => d.exercises.map((e) => [e.id, e] as const)),
    ),
  );
}

/** Lần tập gần nhất của một bài; `null` khi bài chưa có lịch sử. */
export async function findLastTime(
  exerciseId: string,
): Promise<LastTime | null> {
  const [last] = await findHistory(exerciseId, 1);
  return last ?? null;
}
