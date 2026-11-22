import type {
  CatalogExercise,
  SessionExercise,
  SetLog,
  UnitPref,
  WorkoutSession,
} from '@fitness/contract';
import { equipmentDefaults } from '@fitness/engine';
import type { EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, type OutboxEvent } from '@/db/db';

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

/** Tên bảng phía server, dùng làm `entity` của sự kiện outbox. */
type Entity = 'workout_sessions' | 'session_exercises' | 'set_logs';

const now = () => new Date().toISOString();

/** Ghi bản ghi và sự kiện outbox; gọi bên trong transaction có `db.outbox`. */
async function put<T extends { id: string }>(
  table: EntityTable<T, 'id'>,
  entity: Entity,
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
 * Thêm một bài ad hoc vào cuối buổi, chụp lại quy ước ghi tạ mặc định theo dụng cụ.
 * Trả về id của bài trong buổi.
 */
export function addExercise(
  sessionId: string,
  exercise: CatalogExercise,
): Promise<string> {
  return db.transaction('rw', db.sessionExercises, db.outbox, async () => {
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

/** Ghi một set working vào cuối bài (UC07 bước 3). */
export function logSet(
  sessionExerciseId: string,
  values: SetValues,
): Promise<void> {
  return db.transaction('rw', db.setLogs, db.outbox, async () => {
    // Đếm cả set đã xoá để `setIndex` không bao giờ trùng.
    const count = await db.setLogs
      .where('sessionExerciseId')
      .equals(sessionExerciseId)
      .count();
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

/** Xoá một set (tombstone, để việc xoá cũng được đồng bộ). */
export function deleteSet(setId: string): Promise<void> {
  return db.transaction('rw', db.setLogs, db.outbox, async () => {
    const row = await db.setLogs.get(setId);
    if (!row || row.deletedAt) return;
    await put(db.setLogs, 'set_logs', { ...row, deletedAt: now() });
  });
}

/** Kết thúc buổi (UC10 bước 1): ghi `endedAt`, kể cả khi đang offline. */
export function finishSession(sessionId: string): Promise<void> {
  return db.transaction('rw', db.workoutSessions, db.outbox, async () => {
    const row = await db.workoutSessions.get(sessionId);
    if (!row || row.endedAt) return;
    await put(db.workoutSessions, 'workout_sessions', {
      ...row,
      endedAt: now(),
    });
  });
}

/** Một bài trong buổi đang mở, kèm bài trong catalog và các set chưa xoá theo thứ tự ghi. */
export interface OpenExercise {
  row: SessionExercise;
  /** `undefined` nếu bài không còn trong cache catalog. */
  exercise: CatalogExercise | undefined;
  sets: SetLog[];
}

export interface OpenSession {
  session: WorkoutSession;
  exercises: OpenExercise[];
  /** Tổng số set đã ghi. */
  setCount: number;
}

async function readOpenSession(): Promise<OpenSession | null> {
  const session = await findOpenSession();
  if (!session) return null;
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
  const exercises = rows.map((row, i) => ({
    row,
    exercise: catalog[i],
    sets: live.filter((s) => s.sessionExerciseId === row.id),
  }));
  return { session, exercises, setCount: live.length };
}

/**
 * Buổi tập đang mở trên máy, tự cập nhật khi dữ liệu đổi. `undefined` khi đang đọc
 * IndexedDB; `null` khi không có buổi nào đang dở.
 */
export function useOpenSession(): OpenSession | null | undefined {
  return useLiveQuery(readOpenSession, []);
}
