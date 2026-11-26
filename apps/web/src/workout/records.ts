import type { CatalogExercise, SessionExercise } from '@fitness/contract';
import {
  type NewRecord,
  newRecords,
  type RecordSession,
} from '@fitness/engine';

import { db } from '@/db/db';

/**
 * PR tạm trên máy (UC07 bước 5, UC17): so set vừa ghi với toàn bộ lịch sử bài trên máy,
 * không chờ mạng. Không lưu: server tính lại và là nguồn chuẩn (#33), nên PR của buổi đang
 * mở được suy lại từ các set mỗi lần đọc.
 */

/**
 * Working set chưa xoá của bài trong mọi buổi đã kết thúc, chưa xoá, kèm quy ước ghi tạ;
 * buổi đang mở không tính. Một buổi có cùng bài hai lần thì gộp các lần cùng quy ước.
 */
export async function findRecordHistory(
  exerciseId: string,
): Promise<RecordSession[]> {
  const rows = (
    await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()
  ).filter((r) => r.deletedAt === null);
  if (rows.length === 0) return [];
  const sessions = await db.workoutSessions.bulkGet(
    rows.map((r) => r.sessionId),
  );
  const finished = rows.filter((_, i) => {
    const s = sessions[i];
    return s && s.endedAt !== null && s.deletedAt === null;
  });
  const sets = await db.setLogs
    .where('sessionExerciseId')
    .anyOf(finished.map((r) => r.id))
    .toArray();
  const byKey = new Map<string, RecordSession>();
  for (const row of finished) {
    const key = `${row.sessionId} ${row.loadInput}`;
    const entry = byKey.get(key) ?? { loadInput: row.loadInput, sets: [] };
    byKey.set(key, entry);
    entry.sets.push(
      ...sets
        .filter(
          (s) =>
            s.sessionExerciseId === row.id &&
            s.setType === 'working' &&
            s.deletedAt === null,
        )
        .sort((a, b) => a.setIndex - b.setIndex)
        .map((s) => ({ weight: s.weightValue, reps: s.reps })),
    );
  }
  return [...byKey.values()];
}

/**
 * PR tạm của từng set (theo id) của một bài trong buổi đang mở: mỗi set so với lịch sử và
 * các set ghi trước nó trong buổi, kể cả set của lần khác cùng bài, cùng quy ước ghi tạ
 * trong buổi (bài thêm hai lần). Set không lập PR thì không có mặt.
 */
export async function findSessionRecords(
  exercise: CatalogExercise | undefined,
  row: SessionExercise,
): Promise<Map<string, NewRecord[]>> {
  const rows = (
    await db.sessionExercises.where('sessionId').equals(row.sessionId).toArray()
  ).filter(
    (r) =>
      r.deletedAt === null &&
      r.exerciseId === row.exerciseId &&
      r.loadInput === row.loadInput,
  );
  const [history, sets] = await Promise.all([
    findRecordHistory(row.exerciseId),
    db.setLogs
      .where('sessionExerciseId')
      .anyOf(rows.map((r) => r.id))
      .toArray(),
  ]);
  const working = sets
    .filter((s) => s.setType === 'working' && s.deletedAt === null)
    // Thứ tự ghi trong buổi: `setIndex` chỉ đúng trong một lần của bài.
    .sort(
      (a, b) =>
        a.completedAt.localeCompare(b.completedAt) || a.setIndex - b.setIndex,
    )
    .map((s) => ({ id: s.id, weight: s.weightValue, reps: s.reps }));
  const records = new Map<string, NewRecord[]>();
  working.forEach((set, i) => {
    const found = newRecords({
      metric: exercise?.metricType ?? 'weight_reps',
      loadInput: row.loadInput,
      history,
      earlier: working.slice(0, i),
      set,
    });
    if (found.length > 0) records.set(set.id, found);
  });
  return records;
}
