import type {
  CatalogExercise,
  RoutineDay,
  RoutineExercise,
  Suggestion,
} from '@fitness/contract';
import {
  type BeforeSession,
  beforeSession,
  type PastSession,
  type PreSessionSuggestion,
} from '@fitness/engine';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/db/db';
import { findHistory } from '@/workout/last-time';

/**
 * Gợi ý trước buổi (UC12) đọc từ dữ liệu trên máy: engine `beforeSession` tính từ các lần
 * tập gần nhất của bài, rồi đối chiếu bản ghi SUGGESTIONS để biết user đã trả lời chưa. Ghi
 * gợi ý và câu trả lời đi qua `workout/session` (outbox).
 */

/**
 * R1/R2 chỉ xét hai lần tập gần nhất; bài ad hoc thì đọc hết lịch sử để tìm lần gần nhất có
 * rep range (SRS Phụ lục A).
 */
const HISTORY_FOR_ADVICE = 2;

/** Gợi ý của engine cho một bài, kèm lần tập làm căn cứ. */
export interface Advice extends BeforeSession {
  /** Lần tập gần nhất (`null`: chưa có lịch sử). */
  lastTime: PastSession | null;
}

/** Ngày hôm nay theo giờ máy (YYYY-MM-DD), truyền vào engine thay vì để engine đọc đồng hồ. */
function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Gợi ý trước buổi cho một bài; `target = null` với bài ad hoc. */
export async function adviseFor(
  exercise: Pick<CatalogExercise, 'id' | 'metricType'> | undefined,
  exerciseId: string,
  target: RoutineExercise | null,
): Promise<Advice> {
  const history = await findHistory(
    exerciseId,
    target ? HISTORY_FOR_ADVICE : undefined,
  );
  const advice = beforeSession({
    today: today(),
    metric: exercise?.metricType ?? 'weight_reps',
    target,
    history,
  });
  return { ...advice, lastTime: history[0] ?? null };
}

/** Bản ghi của gợi ý trước buổi dựa trên lần tập `basis` của bài (chưa xoá). */
export async function findPreSessionRecord(
  exerciseId: string,
  basis: string,
): Promise<Suggestion | undefined> {
  const rows = await db.suggestions
    .where('[exerciseId+basedOnSessionExerciseId]')
    .equals([exerciseId, basis])
    .toArray();
  return rows.find((r) => r.sessionExerciseId === null && !r.deletedAt);
}

/** Gợi ý chưa trả lời: chưa có bản ghi, hoặc bản ghi còn `pending`. */
export function isUnanswered(record: Suggestion | undefined): boolean {
  return !record || record.status === 'pending';
}

/** Một gợi ý có nút trả lời, đủ để hiển thị và ghi câu trả lời. */
export interface Tip {
  exerciseId: string;
  routineExerciseId: string | null;
  /** Lần tập làm căn cứ (`sessionExerciseId` của lần gần nhất). */
  basis: string;
  suggestion: PreSessionSuggestion;
}

/** Gợi ý chưa trả lời của một bài, hoặc `undefined`. */
export async function openTip(
  advice: Advice,
  exerciseId: string,
  routineExerciseId: string | null,
): Promise<Tip | undefined> {
  const { suggestion, lastTime } = advice;
  if (!suggestion || !lastTime) return undefined;
  const basis = lastTime.sessionExerciseId;
  if (!isUnanswered(await findPreSessionRecord(exerciseId, basis))) {
    return undefined;
  }
  return { exerciseId, routineExerciseId, basis, suggestion };
}

/** Gợi ý trên tấm ngày tập ở Today: tên bài và rep range để dựng câu. */
export interface DayTip extends Tip {
  exercise: CatalogExercise | undefined;
  target: RoutineExercise;
}

/**
 * Các gợi ý chưa trả lời của một ngày tập, theo thứ tự bài; tự cập nhật khi dữ liệu trên
 * máy đổi. `undefined` khi đang đọc IndexedDB.
 */
export function useDayTips(day: RoutineDay): DayTip[] | undefined {
  return useLiveQuery(async () => {
    const targets = [...day.exercises].sort((a, b) => a.position - b.position);
    const catalog = await db.exercises.bulkGet(
      targets.map((t) => t.exerciseId),
    );
    const tips = await Promise.all(
      targets.map(async (target, i) => {
        const exercise = catalog[i];
        const advice = await adviseFor(exercise, target.exerciseId, target);
        const tip = await openTip(advice, target.exerciseId, target.id);
        return tip && { ...tip, exercise, target };
      }),
    );
    return tips.filter((t) => t !== undefined);
  }, [day]);
}
