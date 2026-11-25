import { ForbiddenException, Injectable } from '@nestjs/common';
import { SYNC_PULL_MAX_CHANGES } from '@fitness/contract';
import type {
  SessionExercise,
  SetLog,
  Suggestion,
  SyncEvent,
  SyncPullQuery,
  SyncPullResponse,
  SyncPushResponse,
  WorkoutSession,
} from '@fitness/contract';
import type { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { Prisma } from '../generated/prisma/client';
import { decodeCursor, encodeCursor, readChanges } from './pull-sources';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
type Written = Promise<{ id: string }[]>;

/**
 * Lưu sự kiện outbox (SDD 3.2, 7.2) bằng `INSERT ... ON CONFLICT (id) DO UPDATE`, nên gửi
 * lại cùng một batch không tạo bản ghi trùng; thay đổi sau ghi đè thay đổi trước
 * (last-write-wins). `updated_at` do server đặt mỗi lần ghi.
 *
 * Quyền: mỗi câu lệnh chỉ ghi khi cả bản ghi gửi lên (buổi/bài cha, bài trong catalog) lẫn
 * bản ghi đang có trên server (khi trùng id) thuộc về user; không thì không có dòng nào
 * được ghi và cả batch bị huỷ với 403.
 */
@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async push(
    auth: AuthContext,
    events: SyncEvent[],
  ): Promise<SyncPushResponse> {
    // Lần đẩy đầu có thể tới trước GET /me (app không chờ /me để ghi buổi tập).
    const userId = await this.users.ensureUserId(auth);
    await this.prisma.$transaction(async (tx) => {
      // Đúng thứ tự trên máy: bài/set có thể trỏ tới buổi/bài vừa tạo trong cùng batch.
      for (const event of events) {
        const written = await write(tx, userId, event);
        if (written.length === 0) {
          throw new ForbiddenException(
            `${event.entity} ${event.payload.id} không thuộc user`,
          );
        }
      }
    });
    return { applied: events.length };
  }

  /**
   * Thay đổi của user sau cursor `since` (SDD 3.2), kể cả tombstone, theo thứ tự
   * (`updated_at`, bảng, id). Đọc mọi bảng trong một snapshot (REPEATABLE READ) để một lần
   * push commit giữa chừng không làm cursor vượt qua bản ghi chưa đọc.
   *
   * TODO(sync): transaction push bắt đầu trước nhưng commit sau một lần pull có thể mang
   * `updated_at` nhỏ hơn cursor đã trả và bị bỏ qua. Chỉ xảy ra khi hai nơi cùng ghi cho
   * một user (nhiều tab/máy); chấp nhận theo giả định một user một máy.
   */
  async pull(
    auth: AuthContext,
    query: SyncPullQuery,
  ): Promise<SyncPullResponse> {
    const since = query.since ? decodeCursor(query.since) : null;
    const limit = query.limit ?? SYNC_PULL_MAX_CHANGES;
    const user = await this.prisma.user.findUnique({
      where: { authSubject: auth.sub },
      select: { id: true },
    });
    if (!user)
      return { changes: [], cursor: query.since ?? null, hasMore: false };
    const { rows, hasMore } = await this.prisma.$transaction(
      (tx) => readChanges(tx, user.id, since, limit),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const last = rows.at(-1);
    return {
      changes: rows.map((row) => row.change),
      cursor: last ? encodeCursor(last.key) : (query.since ?? null),
      hasMore,
    };
  }
}

function write(tx: Tx, userId: string, event: SyncEvent): Written {
  switch (event.entity) {
    case 'workout_sessions':
      return upsertSession(tx, userId, event.payload);
    case 'session_exercises':
      return upsertSessionExercise(tx, userId, event.payload);
    case 'set_logs':
      return upsertSetLog(tx, userId, event.payload);
    case 'suggestions':
      return upsertSuggestion(tx, userId, event.payload);
  }
}

function upsertSession(tx: Tx, userId: string, s: WorkoutSession): Written {
  return tx.$queryRaw`
    INSERT INTO workout_sessions
      (id, user_id, routine_day_id, started_at, ended_at, notes, updated_at, deleted_at)
    VALUES (
      ${s.id}::uuid, ${userId}::uuid, ${s.routineDayId}::uuid,
      ${s.startedAt}::timestamptz, ${s.endedAt}::timestamptz, ${s.notes},
      now(), ${s.deletedAt}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      routine_day_id = EXCLUDED.routine_day_id,
      started_at = EXCLUDED.started_at,
      ended_at = EXCLUDED.ended_at,
      notes = EXCLUDED.notes,
      updated_at = now(),
      deleted_at = EXCLUDED.deleted_at
    WHERE workout_sessions.user_id = EXCLUDED.user_id
    RETURNING id`;
}

function upsertSessionExercise(
  tx: Tx,
  userId: string,
  e: SessionExercise,
): Written {
  return tx.$queryRaw`
    INSERT INTO session_exercises
      (id, session_id, exercise_id, routine_exercise_id, load_input, position,
       superset_group, updated_at, deleted_at)
    SELECT
      ${e.id}::uuid, ${e.sessionId}::uuid, ${e.exerciseId}::uuid,
      ${e.routineExerciseId}::uuid, ${e.loadInput}::"LoadInput", ${e.position}::int,
      ${e.supersetGroup}::int, now(), ${e.deletedAt}::timestamptz
    WHERE EXISTS (
        SELECT 1 FROM workout_sessions w
        WHERE w.id = ${e.sessionId}::uuid AND w.user_id = ${userId}::uuid)
      AND EXISTS (
        SELECT 1 FROM exercises x
        WHERE x.id = ${e.exerciseId}::uuid
          AND (x.owner_id IS NULL OR x.owner_id = ${userId}::uuid))
    ON CONFLICT (id) DO UPDATE SET
      session_id = EXCLUDED.session_id,
      exercise_id = EXCLUDED.exercise_id,
      routine_exercise_id = EXCLUDED.routine_exercise_id,
      load_input = EXCLUDED.load_input,
      position = EXCLUDED.position,
      superset_group = EXCLUDED.superset_group,
      updated_at = now(),
      deleted_at = EXCLUDED.deleted_at
    WHERE EXISTS (
      SELECT 1 FROM workout_sessions w
      WHERE w.id = session_exercises.session_id AND w.user_id = ${userId}::uuid)
    RETURNING id`;
}

function upsertSetLog(tx: Tx, userId: string, s: SetLog): Written {
  return tx.$queryRaw`
    INSERT INTO set_logs
      (id, session_exercise_id, set_index, set_type, weight_value, input_unit, reps,
       duration_s, distance_m, rpe, completed_at, updated_at, deleted_at)
    SELECT
      ${s.id}::uuid, ${s.sessionExerciseId}::uuid, ${s.setIndex}::int,
      ${s.setType}::"SetType", ${s.weightValue}::numeric, ${s.inputUnit}::"UnitPref",
      ${s.reps}::int, ${s.durationS}::int, ${s.distanceM}::numeric, ${s.rpe}::numeric,
      ${s.completedAt}::timestamptz, now(), ${s.deletedAt}::timestamptz
    WHERE EXISTS (
      SELECT 1 FROM session_exercises e
      JOIN workout_sessions w ON w.id = e.session_id
      WHERE e.id = ${s.sessionExerciseId}::uuid AND w.user_id = ${userId}::uuid)
    ON CONFLICT (id) DO UPDATE SET
      session_exercise_id = EXCLUDED.session_exercise_id,
      set_index = EXCLUDED.set_index,
      set_type = EXCLUDED.set_type,
      weight_value = EXCLUDED.weight_value,
      input_unit = EXCLUDED.input_unit,
      reps = EXCLUDED.reps,
      duration_s = EXCLUDED.duration_s,
      distance_m = EXCLUDED.distance_m,
      rpe = EXCLUDED.rpe,
      completed_at = EXCLUDED.completed_at,
      updated_at = now(),
      deleted_at = EXCLUDED.deleted_at
    WHERE EXISTS (
      SELECT 1 FROM session_exercises e
      JOIN workout_sessions w ON w.id = e.session_id
      WHERE e.id = set_logs.session_exercise_id AND w.user_id = ${userId}::uuid)
    RETURNING id`;
}

/**
 * Gợi ý không có khoá ngoại sang bài trong ngày tập hay trong buổi (ghi offline, có thể tới
 * sau khi các bản ghi đó bị xoá); chỉ kiểm bài được gợi ý là bài user thấy được.
 */
function upsertSuggestion(tx: Tx, userId: string, s: Suggestion): Written {
  return tx.$queryRaw`
    INSERT INTO suggestions
      (id, user_id, exercise_id, routine_exercise_id, session_exercise_id,
       based_on_session_exercise_id, kind, strength, payload, reason, status,
       created_at, responded_at, updated_at, deleted_at)
    SELECT
      ${s.id}::uuid, ${userId}::uuid, ${s.exerciseId}::uuid,
      ${s.routineExerciseId}::uuid, ${s.sessionExerciseId}::uuid,
      ${s.basedOnSessionExerciseId}::uuid, ${s.kind}::"SuggestionKind",
      ${s.strength}::"SuggestionStrength", ${JSON.stringify(s.payload)}::jsonb,
      ${s.reason}, ${s.status}::"SuggestionStatus", ${s.createdAt}::timestamptz,
      ${s.respondedAt}::timestamptz, now(), ${s.deletedAt}::timestamptz
    WHERE EXISTS (
      SELECT 1 FROM exercises x
      WHERE x.id = ${s.exerciseId}::uuid
        AND (x.owner_id IS NULL OR x.owner_id = ${userId}::uuid))
    ON CONFLICT (id) DO UPDATE SET
      exercise_id = EXCLUDED.exercise_id,
      routine_exercise_id = EXCLUDED.routine_exercise_id,
      session_exercise_id = EXCLUDED.session_exercise_id,
      based_on_session_exercise_id = EXCLUDED.based_on_session_exercise_id,
      kind = EXCLUDED.kind,
      strength = EXCLUDED.strength,
      payload = EXCLUDED.payload,
      reason = EXCLUDED.reason,
      status = EXCLUDED.status,
      created_at = EXCLUDED.created_at,
      responded_at = EXCLUDED.responded_at,
      updated_at = now(),
      deleted_at = EXCLUDED.deleted_at
    WHERE suggestions.user_id = EXCLUDED.user_id
    RETURNING id`;
}
