import type {
  CatalogExercise,
  RoutineDay,
  RoutineExercise,
  SessionExercise,
  SetLog,
  Suggestion,
  SyncEntity,
  UnitPref,
  WorkoutSession,
} from '@fitness/contract';
import { equipmentDefaults, type LastTime } from '@fitness/engine';
import type { EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, type OutboxEvent } from '@/db/db';
import {
  type Advice,
  adviseFor,
  findPreSessionRecord,
  openTip,
  type Tip,
} from '@/workout/suggestions';

/**
 * Ghi buổi tập trên máy (UC06, UC07, UC10 phần cục bộ; SDD 3.2). Mọi thay đổi lưu vào
 * IndexedDB cùng transaction với một sự kiện outbox chứa cả bản ghi, nên chạy được khi
 * offline và đóng tab giữa buổi không mất gì. Bộ đẩy outbox (POST /sync/push) đọc các sự
 * kiện này theo `seq`.
 */

/**
 * Đơn vị ghi tạ. Chưa có cài đặt đơn vị trên máy (UC02) nên luôn là kg; khi có thì đọc
 * `unitPref` ở đây, set cũ vẫn giữ `inputUnit` lúc ghi.
 */
export const INPUT_UNIT: UnitPref = 'kg';

const now = () => new Date().toISOString();

/** Ghi bản ghi và sự kiện outbox; gọi bên trong transaction có `db.outbox`. */
async function put<T extends { id: string }>(
  table: EntityTable<T, 'id'>,
  entity: SyncEntity,
  row: T,
) {
  await table.put(row);
  const event: Omit<OutboxEvent, 'seq'> = {
    entity,
    entityId: row.id,
    // Xoá là tombstone `deletedAt`, đẩy lên bằng upsert như mọi thay đổi khác.
    op: 'upsert',
    payload: row,
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.outbox.add(event as OutboxEvent);
}

/** Buổi đang mở mới nhất (chưa kết thúc, chưa xoá). */
function findOpenSession() {
  return db.workoutSessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => s.endedAt === null && s.deletedAt === null)
    .first();
}

/** Bảng mà việc đưa ra gợi ý trước buổi đọc và ghi. */
const ADVICE_TABLES = [
  db.suggestions,
  db.sessionExercises,
  db.workoutSessions,
  db.setLogs,
  db.routines,
  db.exercises,
  db.outbox,
];

function suggestionRow(
  tip: Tip,
  status: Suggestion['status'],
  at: string,
): Suggestion {
  return {
    id: crypto.randomUUID(),
    exerciseId: tip.exerciseId,
    routineExerciseId: tip.routineExerciseId,
    sessionExerciseId: null,
    basedOnSessionExerciseId: tip.basis,
    kind: tip.suggestion.kind,
    strength: 'soft',
    reason: tip.suggestion.reason,
    payload: { ...tip.suggestion.params },
    status,
    createdAt: at,
    respondedAt: status === 'pending' ? null : at,
    deletedAt: null,
  };
}

/**
 * Ghi gợi ý trước buổi (UC12) của một bài vừa vào buổi ở trạng thái `pending`, nếu chưa có
 * bản ghi cho cùng căn cứ (vd user đã trả lời ở Today). Gọi trong transaction có
 * `ADVICE_TABLES`.
 */
async function issueSuggestion(
  row: SessionExercise,
  exercise: CatalogExercise | undefined,
  target: RoutineExercise | null,
) {
  const advice = await adviseFor(exercise, row.exerciseId, target);
  const tip = await openTip(advice, row.exerciseId, row.routineExerciseId);
  if (!tip) return;
  if (await findPreSessionRecord(tip.exerciseId, tip.basis)) return;
  await put(
    db.suggestions,
    'suggestions',
    suggestionRow(tip, 'pending', now()),
  );
}

/**
 * Trả lời một gợi ý trước buổi ("Got it" là `accepted`), ở Today hay trên màn ghi set. Chưa
 * có bản ghi (chưa vào buổi) thì tạo luôn bản ghi đã trả lời, để lúc vào buổi không đưa ra
 * gợi ý đó lần nữa.
 */
export function answerSuggestion(
  tip: Tip,
  status: 'accepted' | 'dismissed',
): Promise<void> {
  return db.transaction('rw', db.suggestions, db.outbox, async () => {
    const at = now();
    const record = await findPreSessionRecord(tip.exerciseId, tip.basis);
    if (record && record.status !== 'pending') return;
    await put(
      db.suggestions,
      'suggestions',
      record
        ? { ...record, status, respondedAt: at }
        : suggestionRow(tip, status, at),
    );
  });
}

/** Đổi trạng thái các gợi ý trước buổi còn `pending` thoả `match`. */
async function closePending(
  status: 'dismissed' | 'expired',
  match: (s: Suggestion) => boolean = () => true,
) {
  const pending = await db.suggestions
    .where('status')
    .equals('pending')
    .filter((s) => s.sessionExerciseId === null && !s.deletedAt && match(s))
    .toArray();
  const at = now();
  for (const row of pending) {
    await put(db.suggestions, 'suggestions', {
      ...row,
      status,
      respondedAt: status === 'dismissed' ? at : null,
    });
  }
}

/**
 * Bắt đầu buổi tập tự do (UC06 nhánh tự do). Đã có buổi đang mở thì trả về buổi đó,
 * không mở buổi thứ hai (bấm hai lần, hai tab).
 */
export function startFreestyle(): Promise<string> {
  return db.transaction('rw', db.workoutSessions, db.outbox, async () => {
    const open = await findOpenSession();
    if (open) return open.id;
    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      routineDayId: null,
      startedAt: now(),
      endedAt: null,
      notes: null,
      deletedAt: null,
    };
    await put(db.workoutSessions, 'workout_sessions', session);
    return session.id;
  });
}

/**
 * Ngày tập theo id trong cache routine (mọi routine trên máy). `undefined` khi tra không ra
 * (ngày đã xoá, routine đã xoá): buổi theo ngày đó coi như tập tự do (SDD 7.2).
 */
async function findRoutineDay(dayId: string): Promise<RoutineDay | undefined> {
  for (const routine of await db.routines.toArray()) {
    const day = routine.days.find((d) => d.id === dayId);
    if (day) return day;
  }
  return undefined;
}

/**
 * Bắt đầu buổi theo một ngày tập (UC06 bước 2–3), đọc từ cache routine nên chạy được khi
 * offline: buổi mang `routineDayId`, các bài theo thứ tự trong ngày, mỗi bài gắn
 * `routineExerciseId` và chụp lại quy ước ghi tạ mặc định theo dụng cụ. Đã có buổi đang mở
 * thì trả về buổi đó, như tập tự do.
 */
export function startRoutineDay(dayId: string): Promise<string> {
  return db.transaction('rw', ADVICE_TABLES, async () => {
    const open = await findOpenSession();
    if (open) return open.id;
    const day = await findRoutineDay(dayId);
    if (!day) throw new Error(`Không có ngày tập ${dayId} trên máy`);
    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      routineDayId: day.id,
      startedAt: now(),
      endedAt: null,
      notes: null,
      deletedAt: null,
    };
    await put(db.workoutSessions, 'workout_sessions', session);
    const planned = [...day.exercises].sort((a, b) => a.position - b.position);
    const catalog = await db.exercises.bulkGet(
      planned.map((e) => e.exerciseId),
    );
    for (const [position, target] of planned.entries()) {
      const row: SessionExercise = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        exerciseId: target.exerciseId,
        routineExerciseId: target.id,
        loadInput: equipmentDefaults(catalog[position]?.equipment ?? null)
          .loadInput,
        position,
        supersetGroup: target.supersetGroup,
        deletedAt: null,
      };
      await put(db.sessionExercises, 'session_exercises', row);
      await issueSuggestion(row, catalog[position], target);
    }
    return session.id;
  });
}

/**
 * Thêm một bài ad hoc vào cuối buổi, chụp lại quy ước ghi tạ mặc định theo dụng cụ.
 * Trả về id của bài trong buổi.
 */
export function addExercise(
  sessionId: string,
  exercise: CatalogExercise,
): Promise<string> {
  return db.transaction('rw', ADVICE_TABLES, async () => {
    const existing = await db.sessionExercises
      .where('sessionId')
      .equals(sessionId)
      .toArray();
    const row: SessionExercise = {
      id: crypto.randomUUID(),
      sessionId,
      exerciseId: exercise.id,
      routineExerciseId: null,
      loadInput: equipmentDefaults(exercise.equipment).loadInput,
      position: Math.max(-1, ...existing.map((e) => e.position)) + 1,
      supersetGroup: null,
      deletedAt: null,
    };
    await put(db.sessionExercises, 'session_exercises', row);
    // Bài ad hoc: rep range lấy từ lần tập gần nhất có rep range (SRS Phụ lục A).
    await issueSuggestion(row, exercise, null);
    return row.id;
  });
}

/** Số liệu user nhập cho một set. `weight = null` với bài chỉ reps. */
export interface SetValues {
  weight: number | null;
  reps: number;
}

function setFields({ weight, reps }: SetValues) {
  return {
    weightValue: weight,
    inputUnit: weight === null ? null : INPUT_UNIT,
    reps,
  };
}

/**
 * Ghi một set working vào cuối bài (UC07 bước 3). Set đầu của bài mà gợi ý trước buổi của
 * bài vẫn chưa được trả lời thì coi như user bỏ qua gợi ý (`dismissed`).
 */
export function logSet(
  sessionExerciseId: string,
  values: SetValues,
): Promise<void> {
  return db.transaction(
    'rw',
    [db.setLogs, db.outbox, db.sessionExercises, db.suggestions],
    async () => {
      const existing = await db.setLogs
        .where('sessionExerciseId')
        .equals(sessionExerciseId)
        .toArray();
      // Đếm cả set đã xoá để `setIndex` không bao giờ trùng.
      const count = existing.length;
      if (!existing.some((s) => s.deletedAt === null)) {
        const exercise = await db.sessionExercises.get(sessionExerciseId);
        if (exercise) {
          await closePending(
            'dismissed',
            (s) => s.exerciseId === exercise.exerciseId,
          );
        }
      }
      const row: SetLog = {
        id: crypto.randomUUID(),
        sessionExerciseId,
        setIndex: count,
        setType: 'working',
        ...setFields(values),
        durationS: null,
        distanceM: null,
        rpe: null,
        completedAt: now(),
        deletedAt: null,
      };
      await put(db.setLogs, 'set_logs', row);
    },
  );
}

/** Sửa số liệu một set trong buổi đang mở. */
export function updateSet(setId: string, values: SetValues): Promise<void> {
  return db.transaction('rw', db.setLogs, db.outbox, async () => {
    const row = await db.setLogs.get(setId);
    if (!row || row.deletedAt) return;
    // Giữ nguyên đơn vị lúc ghi khi set vẫn có tạ.
    const fields = setFields(values);
    await put(db.setLogs, 'set_logs', {
      ...row,
      ...fields,
      inputUnit:
        fields.weightValue === null ? null : (row.inputUnit ?? INPUT_UNIT),
    });
  });
}

/** Xoá một set (tombstone, để việc xoá cũng được đồng bộ). */
export function deleteSet(setId: string): Promise<void> {
  return db.transaction('rw', db.setLogs, db.outbox, async () => {
    const row = await db.setLogs.get(setId);
    if (!row || row.deletedAt) return;
    await put(db.setLogs, 'set_logs', { ...row, deletedAt: now() });
  });
}

/** Khôi phục set vừa xoá (Undo): bỏ tombstone, đẩy lại bằng upsert như mọi thay đổi khác. */
export function restoreSet(setId: string): Promise<void> {
  return db.transaction('rw', db.setLogs, db.outbox, async () => {
    const row = await db.setLogs.get(setId);
    if (!row?.deletedAt) return;
    await put(db.setLogs, 'set_logs', { ...row, deletedAt: null });
  });
}

/**
 * Kết thúc buổi (UC10 bước 1): ghi `endedAt`, kể cả khi đang offline. Gợi ý trước buổi chưa
 * được trả lời thì hết hạn (`expired`).
 */
export function finishSession(sessionId: string): Promise<void> {
  return db.transaction(
    'rw',
    [db.workoutSessions, db.outbox, db.suggestions],
    async () => {
      const row = await db.workoutSessions.get(sessionId);
      if (!row || row.endedAt) return;
      await closePending('expired');
      await put(db.workoutSessions, 'workout_sessions', {
        ...row,
        endedAt: now(),
      });
    },
  );
}

/** Một bài trong buổi, kèm bài trong catalog và các set chưa xoá theo thứ tự ghi. */
export interface WorkoutExercise {
  row: SessionExercise;
  /** `undefined` nếu bài không còn trong cache catalog. */
  exercise: CatalogExercise | undefined;
  /**
   * Target của bài trong ngày tập (số set, rep range, nghỉ, tạ khởi điểm); `null` với bài
   * ad hoc, hoặc khi bài đã bị xoá khỏi ngày tập (coi như ad hoc, SDD 7.2).
   */
  target: RoutineExercise | null;
  sets: SetLog[];
}

/** Một buổi kèm các bài chưa xoá (theo vị trí) và set của chúng. */
export interface Workout {
  session: WorkoutSession;
  /** Ngày tập của buổi; `null` khi tập tự do hoặc ngày đã xoá (coi như tự do). */
  day: RoutineDay | null;
  exercises: WorkoutExercise[];
  /** Tổng số set đã ghi (chưa xoá, trong bài chưa xoá). */
  setCount: number;
}

/** Bài trong buổi đang mở, kèm lần tập gần nhất và gợi ý trước buổi của bài. */
export interface OpenExercise extends WorkoutExercise {
  /** `null`: chưa có lịch sử. */
  lastTime: LastTime | null;
  advice: Advice;
  /** Gợi ý trước buổi chưa trả lời; ẩn khi đã ghi set đầu của bài. */
  tip: Tip | undefined;
}
/** Buổi đang mở. */
export interface OpenSession extends Workout {
  exercises: OpenExercise[];
}

/**
 * Đọc "lần trước" cùng lúc với buổi đang mở, để ô nhập có số điền sẵn ngay lần hiện đầu
 * tiên của bài.
 */
async function readOpenSession(): Promise<OpenSession | null> {
  const session = await findOpenSession();
  if (!session) return null;
  const workout = await readWorkout(session);
  const exercises = await Promise.all(
    workout.exercises.map(async (e) => {
      const advice = await adviseFor(e.exercise, e.row.exerciseId, e.target);
      const tip =
        e.sets.length === 0
          ? await openTip(advice, e.row.exerciseId, e.row.routineExerciseId)
          : undefined;
      return { ...e, lastTime: advice.lastTime, advice, tip };
    }),
  );
  return { ...workout, exercises };
}

/** Đọc các bài và set của một buổi; gọi trong `useLiveQuery` để tự cập nhật. */
export async function readWorkout(session: WorkoutSession): Promise<Workout> {
  const rows = (
    await db.sessionExercises.where('sessionId').equals(session.id).toArray()
  )
    .filter((e) => e.deletedAt === null)
    .sort((a, b) => a.position - b.position);
  const [catalog, sets] = await Promise.all([
    db.exercises.bulkGet(rows.map((r) => r.exerciseId)),
    db.setLogs
      .where('sessionExerciseId')
      .anyOf(rows.map((r) => r.id))
      .toArray(),
  ]);
  const live = sets
    .filter((s) => s.deletedAt === null)
    .sort((a, b) => a.setIndex - b.setIndex);
  const day = session.routineDayId
    ? ((await findRoutineDay(session.routineDayId)) ?? null)
    : null;
  const targets = new Map(day?.exercises.map((e) => [e.id, e]));
  const exercises = rows.map((row, i) => ({
    row,
    exercise: catalog[i],
    target: row.routineExerciseId
      ? (targets.get(row.routineExerciseId) ?? null)
      : null,
    sets: live.filter((s) => s.sessionExerciseId === row.id),
  }));
  return { session, day, exercises, setCount: live.length };
}

/**
 * Buổi tập đang mở trên máy, tự cập nhật khi dữ liệu đổi. `undefined` khi đang đọc
 * IndexedDB; `null` khi không có buổi nào đang dở.
 */
export function useOpenSession(): OpenSession | null | undefined {
  return useLiveQuery(readOpenSession, []);
}
