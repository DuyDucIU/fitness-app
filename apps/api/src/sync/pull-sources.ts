import { BadRequestException } from '@nestjs/common';
import type { SyncEntity, SyncEvent } from '@fitness/contract';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * Vị trí của một thay đổi trong luồng pull: `updated_at` đủ độ chính xác micro giây của
 * PostgreSQL (dạng ISO UTC, so sánh được như chuỗi), rồi thứ tự bảng, rồi id. Một batch
 * push ghi mọi bản ghi cùng một `updated_at` (`now()` của transaction), nên cần cả bảng
 * và id để cắt trang giữa các bản ghi trùng thời điểm mà không bỏ sót hay lặp lại.
 */
export interface PullKey {
  ts: string;
  entity: SyncEntity;
  id: string;
}

/** Một bản ghi đã đọc, kèm vị trí để sắp xếp và làm cursor. */
export interface PulledRow {
  key: PullKey;
  change: SyncEvent;
}

/**
 * Một bảng trong pull. `read` trả tối đa `limit` bản ghi của user có
 * `(updated_at, id) <op> (ts, id)`, theo thứ tự đó; `op` là `>` hoặc `>=`.
 */
interface PullSource {
  entity: SyncEntity;
  read(
    tx: Tx,
    userId: string,
    after: { ts: string; id: string; op: '>' | '>=' } | null,
    limit: number,
  ): Promise<PulledRow[]>;
}

/** `updated_at` dạng ISO UTC đủ micro giây (Date của JS chỉ giữ mili giây). */
const tsText = (column: string) =>
  Prisma.raw(
    `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  );

function afterClause(
  column: string,
  after: { ts: string; id: string; op: '>' | '>=' } | null,
  idColumn: string,
): Prisma.Sql {
  if (!after) return Prisma.empty;
  return Prisma.sql`AND (${Prisma.raw(column)}, ${Prisma.raw(idColumn)}) ${Prisma.raw(after.op)} (${after.ts}::timestamptz, ${after.id}::uuid)`;
}

const iso = (date: Date) => date.toISOString();
const isoOrNull = (date: Date | null) => (date ? iso(date) : null);

/**
 * Các bảng đi qua outbox, theo thứ tự trả về khi trùng `updated_at` (buổi trước bài, bài
 * trước set). Thêm bảng mới = thêm một phần tử ở cuối (giữ thứ tự cũ để cursor đã phát
 * vẫn đúng) và thêm bảng đó vào `SyncEventSchema`.
 */
const SOURCES: PullSource[] = [
  {
    entity: 'workout_sessions',
    async read(tx, userId, after, limit) {
      const rows = await tx.$queryRaw<
        {
          ts: string;
          id: string;
          routine_day_id: string | null;
          started_at: Date;
          ended_at: Date | null;
          notes: string | null;
          deleted_at: Date | null;
        }[]
      >`
        SELECT ${tsText('w.updated_at')} AS ts, w.id::text AS id,
          w.routine_day_id::text AS routine_day_id, w.started_at, w.ended_at, w.notes,
          w.deleted_at
        FROM workout_sessions w
        WHERE w.user_id = ${userId}::uuid ${afterClause('w.updated_at', after, 'w.id')}
        ORDER BY w.updated_at, w.id
        LIMIT ${limit}`;
      return rows.map((r) => ({
        key: { ts: r.ts, entity: 'workout_sessions', id: r.id },
        change: {
          entity: 'workout_sessions',
          op: 'upsert',
          payload: {
            id: r.id,
            routineDayId: r.routine_day_id,
            startedAt: iso(r.started_at),
            endedAt: isoOrNull(r.ended_at),
            notes: r.notes,
            deletedAt: isoOrNull(r.deleted_at),
          },
        },
      }));
    },
  },
  {
    entity: 'session_exercises',
    async read(tx, userId, after, limit) {
      const rows = await tx.$queryRaw<
        {
          ts: string;
          id: string;
          session_id: string;
          exercise_id: string;
          routine_exercise_id: string | null;
          load_input: SyncLoadInput;
          position: number;
          superset_group: number | null;
          deleted_at: Date | null;
        }[]
      >`
        SELECT ${tsText('e.updated_at')} AS ts, e.id::text AS id,
          e.session_id::text AS session_id, e.exercise_id::text AS exercise_id,
          e.routine_exercise_id::text AS routine_exercise_id,
          e.load_input::text AS load_input, e.position, e.superset_group, e.deleted_at
        FROM session_exercises e
        JOIN workout_sessions w ON w.id = e.session_id
        WHERE w.user_id = ${userId}::uuid ${afterClause('e.updated_at', after, 'e.id')}
        ORDER BY e.updated_at, e.id
        LIMIT ${limit}`;
      return rows.map((r) => ({
        key: { ts: r.ts, entity: 'session_exercises', id: r.id },
        change: {
          entity: 'session_exercises',
          op: 'upsert',
          payload: {
            id: r.id,
            sessionId: r.session_id,
            exerciseId: r.exercise_id,
            routineExerciseId: r.routine_exercise_id,
            loadInput: r.load_input,
            position: r.position,
            supersetGroup: r.superset_group,
            deletedAt: isoOrNull(r.deleted_at),
          },
        },
      }));
    },
  },
  {
    entity: 'set_logs',
    async read(tx, userId, after, limit) {
      const rows = await tx.$queryRaw<
        {
          ts: string;
          id: string;
          session_exercise_id: string;
          set_index: number;
          set_type: SyncSetType;
          weight_value: number | null;
          input_unit: 'kg' | 'lb' | null;
          reps: number | null;
          duration_s: number | null;
          distance_m: number | null;
          rpe: number | null;
          completed_at: Date;
          deleted_at: Date | null;
        }[]
      >`
        SELECT ${tsText('s.updated_at')} AS ts, s.id::text AS id,
          s.session_exercise_id::text AS session_exercise_id, s.set_index,
          s.set_type::text AS set_type, s.weight_value::float8 AS weight_value,
          s.input_unit::text AS input_unit, s.reps, s.duration_s,
          s.distance_m::float8 AS distance_m, s.rpe::float8 AS rpe, s.completed_at,
          s.deleted_at
        FROM set_logs s
        JOIN session_exercises e ON e.id = s.session_exercise_id
        JOIN workout_sessions w ON w.id = e.session_id
        WHERE w.user_id = ${userId}::uuid ${afterClause('s.updated_at', after, 's.id')}
        ORDER BY s.updated_at, s.id
        LIMIT ${limit}`;
      return rows.map((r) => ({
        key: { ts: r.ts, entity: 'set_logs', id: r.id },
        change: {
          entity: 'set_logs',
          op: 'upsert',
          payload: {
            id: r.id,
            sessionExerciseId: r.session_exercise_id,
            setIndex: r.set_index,
            setType: r.set_type,
            weightValue: r.weight_value,
            inputUnit: r.input_unit,
            reps: r.reps,
            durationS: r.duration_s,
            distanceM: r.distance_m,
            rpe: r.rpe,
            completedAt: iso(r.completed_at),
            deletedAt: isoOrNull(r.deleted_at),
          },
        },
      }));
    },
  },
];

type SyncLoadInput = Extract<
  SyncEvent,
  { entity: 'session_exercises' }
>['payload']['loadInput'];
type SyncSetType = Extract<
  SyncEvent,
  { entity: 'set_logs' }
>['payload']['setType'];

const rank = (entity: SyncEntity) =>
  SOURCES.findIndex((source) => source.entity === entity);

function compareKeys(a: PullKey, b: PullKey): number {
  if (a.ts !== b.ts) return a.ts < b.ts ? -1 : 1;
  if (a.entity !== b.entity) return rank(a.entity) - rank(b.entity);
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Cursor mờ cho client: base64url của vị trí thay đổi cuối cùng đã trả. */
export function encodeCursor(key: PullKey): string {
  return Buffer.from(`${key.ts}|${key.entity}|${key.id}`).toString('base64url');
}

export function decodeCursor(cursor: string): PullKey {
  const [ts, entity, id, ...rest] = Buffer.from(cursor, 'base64url')
    .toString()
    .split('|');
  const source = SOURCES.find((s) => s.entity === entity);
  if (rest.length || !TS.test(ts ?? '') || !source || !UUID.test(id ?? '')) {
    throw new BadRequestException('Cursor không hợp lệ');
  }
  return { ts, entity: source.entity, id };
}

/**
 * Tối đa `limit` thay đổi đầu tiên sau `since`, theo thứ tự (`updated_at`, bảng, id).
 * Mỗi bảng đọc `limit + 1` bản ghi đầu của nó; ghép lại, `limit` bản ghi nhỏ nhất là
 * `limit` bản ghi nhỏ nhất của mọi bảng, và còn dư nghĩa là còn trang sau.
 */
export async function readChanges(
  tx: Tx,
  userId: string,
  since: PullKey | null,
  limit: number,
): Promise<{ rows: PulledRow[]; hasMore: boolean }> {
  const all: PulledRow[] = [];
  for (const source of SOURCES) {
    let after: { ts: string; id: string; op: '>' | '>=' } | null = null;
    if (since) {
      const order = rank(source.entity) - rank(since.entity);
      // Bảng xếp trước bảng của cursor: chỉ lấy sau thời điểm đó; cùng bảng: sau id đó;
      // bảng xếp sau: lấy cả bản ghi cùng thời điểm.
      after =
        order < 0
          ? { ts: since.ts, id: MAX_UUID, op: '>' }
          : order === 0
            ? { ts: since.ts, id: since.id, op: '>' }
            : { ts: since.ts, id: NIL_UUID, op: '>=' };
    }
    all.push(...(await source.read(tx, userId, after, limit + 1)));
  }
  all.sort((a, b) => compareKeys(a.key, b.key));
  return { rows: all.slice(0, limit), hasMore: all.length > limit };
}

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const MAX_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
