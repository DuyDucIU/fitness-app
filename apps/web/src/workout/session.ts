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
import { afterSet, equipmentDefaults, type LastTime } from '@fitness/engine';
import type { EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, type OutboxEvent } from '@/db/db';
import { findHistory } from '@/workout/last-time';
import {
  type Advice,
  adviseFor,
  backOffParams,
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

/** Đổi trạng thái các gợi ý (trước buổi lẫn back-off) còn `pending` thoả `match`. */
async function closePending(
  status: 'dismissed' | 'expired',
  match: (s: Suggestion) => boolean = () => true,
) {
  const pending = await db.suggestions
    .where('status')
    .equals('pending')
    .filter((s) => !s.deletedAt && match(s))
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

/** Bài trong ngày tập của một bài trong buổi; `null` khi ad hoc hay đã bị xoá khỏi ngày tập. */
async function targetOf(row: SessionExercise): Promise<RoutineExercise | null> {
  if (!row.routineExerciseId) return null;
  const session = await db.workoutSessions.get(row.sessionId);
  const day = session?.routineDayId
    ? await findRoutineDay(session.routineDayId)
    : undefined;
  return day?.exercises.find((e) => e.id === row.routineExerciseId) ?? null;
}

/** Các gợi ý back-off (UC13) chưa xoá (`deleted`: đã xoá) của một bài trong buổi, cũ trước. */
async function backOffsOf(
  sessionExerciseId: string,
  deleted = false,
): Promise<Suggestion[]> {
  return (
    await db.suggestions
      .where('sessionExerciseId')
      .equals(sessionExerciseId)
      .toArray()
  )
    .filter((s) => s.kind === 'back_off' && !!s.deletedAt === deleted)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Back-off đang áp cho các set chờ tập của một bài. */
export interface ActiveBackOff {
  suggestion: Suggestion;
  /** Mức tạ điền sẵn: mức back-off, hoặc mức cũ khi user đã bấm "Keep". */
  weight: number;
}

/**
 * Back-off đang áp cho các set còn lại của bài (UC07 bước 3): gợi ý mới nhất của bài, điền
 * mức back-off khi chưa bỏ qua, mức cũ khi đã bỏ qua. Thôi áp khi một set ghi sau set gây
 * back-off dùng mức tạ khác (user đã tự chọn mức), hoặc set gây back-off không còn.
 */
async function activeBackOff(
  sessionExerciseId: string,
): Promise<ActiveBackOff | null> {
  const latest = (await backOffsOf(sessionExerciseId)).at(-1);
  const params = latest && backOffParams(latest);
  if (!latest || !params || latest.status === 'expired') return null;
  const weight = latest.status === 'dismissed' ? params.from : params.to;
  const sets = (
    await db.setLogs
      .where('sessionExerciseId')
      .equals(sessionExerciseId)
      .toArray()
  ).filter((s) => s.deletedAt === null);
  const cause = sets.find((s) => s.id === latest.payload.setLogId);
  if (!cause) return null;
  const changed = sets.some(
    (s) => s.setIndex > cause.setIndex && s.weightValue !== weight,
  );
  return changed ? null : { suggestion: latest, weight };
}

/**
 * Ghi gợi ý back-off (R3) nếu set vừa ghi chạm hoặc dưới sàn rep range. Gọi trong
 * transaction có `ADVICE_TABLES`.
 */
async function issueBackOff(
  row: SessionExercise,
  set: SetLog,
  setsLeft: number,
) {
  const exercise = await db.exercises.get(row.exerciseId);
  const target = await targetOf(row);
  // Bài ad hoc: rep range lấy từ lần tập gần nhất có rep range (SRS Phụ lục A).
  const history = target ? [] : await findHistory(row.exerciseId);
  // Bậc tạ và đòn mặc định theo dụng cụ; cài đặt riêng từng bài (UC14) chưa có.
  const { stepKg, barWeightKg } = equipmentDefaults(
    exercise?.equipment ?? null,
  );
  const backOff = afterSet({
    metric: exercise?.metricType ?? 'weight_reps',
    target,
    history,
    set: { weight: set.weightValue, reps: set.reps, rpe: set.rpe },
    setsLeft,
    loadInput: row.loadInput,
    stepKg,
    barWeightKg,
  });
  if (!backOff) return;
  await put(db.suggestions, 'suggestions', {
    id: crypto.randomUUID(),
    exerciseId: row.exerciseId,
    routineExerciseId: row.routineExerciseId,
    sessionExerciseId: row.id,
    basedOnSessionExerciseId: null,
    kind: backOff.kind,
    // Nêu một mức tạ cụ thể và điền sẵn ô nhập, khác gợi ý tăng chỉ nêu hướng.
    strength: 'strong',
    reason: backOff.reason,
    // `setLogId`: set gây back-off; xoá set đó khi chưa trả lời thì bỏ gợi ý.
    payload: { ...backOff.params, setLogId: set.id },
    status: 'pending',
    createdAt: now(),
    respondedAt: null,
    deletedAt: null,
  });
}

/**
 * Ghi một set working vào cuối bài (UC07 bước 3) và trả về back-off đang áp cho các set
 * còn lại (`null`: không có). `setsLeft`: số set còn chờ tập sau set này, để engine biết có
 * set nào cần back-off (R3) không.
 * - Set đầu của bài mà gợi ý trước buổi vẫn chưa được trả lời: coi như bỏ qua (`dismissed`).
 * - Back-off chưa trả lời: ghi đúng mức back-off là `accepted`, mức khác là `dismissed`.
 */
export function logSet(
  sessionExerciseId: string,
  values: SetValues,
  setsLeft: number,
): Promise<ActiveBackOff | null> {
  return db.transaction('rw', ADVICE_TABLES, async () => {
    const exercise = await db.sessionExercises.get(sessionExerciseId);
    const existing = await db.setLogs
      .where('sessionExerciseId')
      .equals(sessionExerciseId)
      .toArray();
    // Đếm cả set đã xoá để `setIndex` không bao giờ trùng.
    const count = existing.length;
    if (exercise && !existing.some((s) => s.deletedAt === null)) {
      await closePending(
        'dismissed',
        (s) =>
          s.sessionExerciseId === null && s.exerciseId === exercise.exerciseId,
      );
    }
    const at = now();
    for (const s of await backOffsOf(sessionExerciseId)) {
      if (s.status !== 'pending') continue;
      const took = values.weight === backOffParams(s)?.to;
      await put(db.suggestions, 'suggestions', {
        ...s,
        status: took ? 'accepted' : 'dismissed',
        respondedAt: at,
      });
    }
    const row: SetLog = {
      id: crypto.randomUUID(),
      sessionExerciseId,
      setIndex: count,
      setType: 'working',
      ...setFields(values),
      durationS: null,
      distanceM: null,
      // Web chưa có ô nhập RPE (#40); có thì nhánh "= rep_min tuỳ RPE" của R3 tự chạy.
      rpe: null,
      completedAt: at,
      deletedAt: null,
    };
    await put(db.setLogs, 'set_logs', row);
    if (exercise) await issueBackOff(exercise, row, setsLeft);
    return activeBackOff(sessionExerciseId);
  });
}

/**
 * Trả lời gợi ý back-off: "OK" là `accepted`, "Keep" là `dismissed` (các set còn lại trở về
 * mức cũ). Gợi ý đã trả lời thì giữ nguyên.
 */
export function answerBackOff(
  id: string,
  status: 'accepted' | 'dismissed',
): Promise<void> {
  return db.transaction('rw', db.suggestions, db.outbox, async () => {
    const row = await db.suggestions.get(id);
    if (!row || row.deletedAt || row.status !== 'pending') return;
    await put(db.suggestions, 'suggestions', {
      ...row,
      status,
      respondedAt: now(),
    });
  });
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

/**
 * Back-off chưa trả lời do set `setId` gây ra (`deleted`: các bản đã bỏ). Xoá set (vd ghi
 * nhầm) thì gợi ý mất căn cứ, bỏ luôn (tombstone) để không tính vào tỉ lệ chấp nhận; Undo
 * thì khôi phục cùng set.
 */
async function backOffsCausedBy(setId: string, deleted: boolean) {
  const row = await db.setLogs.get(setId);
  if (!row) return [];
  return (await backOffsOf(row.sessionExerciseId, deleted)).filter(
    (s) => s.status === 'pending' && s.payload.setLogId === setId,
  );
}

/** Xoá một set (tombstone, để việc xoá cũng được đồng bộ). */
export function deleteSet(setId: string): Promise<void> {
  return db.transaction(
    'rw',
    [db.setLogs, db.outbox, db.suggestions],
    async () => {
      const row = await db.setLogs.get(setId);
      if (!row || row.deletedAt) return;
      const at = now();
      for (const s of await backOffsCausedBy(setId, false)) {
        await put(db.suggestions, 'suggestions', { ...s, deletedAt: at });
      }
      await put(db.setLogs, 'set_logs', { ...row, deletedAt: at });
    },
  );
}

/** Khôi phục set vừa xoá (Undo): bỏ tombstone, đẩy lại bằng upsert như mọi thay đổi khác. */
export function restoreSet(setId: string): Promise<void> {
  return db.transaction(
    'rw',
    [db.setLogs, db.outbox, db.suggestions],
    async () => {
      const row = await db.setLogs.get(setId);
      if (!row?.deletedAt) return;
      for (const s of await backOffsCausedBy(setId, true)) {
        await put(db.suggestions, 'suggestions', { ...s, deletedAt: null });
      }
      await put(db.setLogs, 'set_logs', { ...row, deletedAt: null });
    },
  );
}

/**
 * Kết thúc buổi (UC10 bước 1): ghi `endedAt`, kể cả khi đang offline. Gợi ý (trước buổi hay
 * back-off) chưa được trả lời thì hết hạn (`expired`).
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
  /** Back-off đang áp cho các set còn lại (UC13); `null`: không có. */
  backOff: ActiveBackOff | null;
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
      const backOff = await activeBackOff(e.row.id);
      return { ...e, lastTime: advice.lastTime, advice, tip, backOff };
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
