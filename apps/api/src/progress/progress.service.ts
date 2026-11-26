import { Injectable } from '@nestjs/common';
import {
  type LoadInput,
  MUSCLE_GROUPS,
  type MuscleGroup,
  PROGRESS_MONTHS,
  PROGRESS_WEEKS,
  type ProgressResponse,
} from '@fitness/contract';
import {
  buildProgress,
  type Metric,
  type ProgressExercise,
  type ProgressMuscle,
  type ProgressSession,
} from '@fitness/engine';
import type { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

/** 1 lb = 0,45359237 kg (định nghĩa quốc tế). */
const KG_PER_LB = 0.45359237;

interface SessionRow {
  id: string;
  date: string;
}

interface SetRow {
  session_id: string;
  row_id: string;
  /** `null`: bài không còn working set nào (LEFT JOIN không khớp). */
  set_id: string | null;
  exercise_id: string;
  load_input: LoadInput;
  metric_type: Metric;
  weight: number | null;
  input_unit: 'kg' | 'lb' | null;
  reps: number | null;
}

interface MuscleRow {
  exercise_id: string;
  muscle_group: string;
  role: ProgressMuscle['role'];
}

/**
 * Biểu đồ tiến độ (UC19), tổng hợp từ buổi đã đồng bộ lên server. Ngày của buổi là ngày
 * kết thúc theo múi giờ của user (đổi múi giờ trong Postgres, trả chữ để không lệch ngày);
 * phần đếm và chọn set làm ở engine (`buildProgress`).
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async get(auth: AuthContext): Promise<ProgressResponse> {
    const user = await this.users.ensureUser(auth);
    const tz = user.timezone;

    const [[{ today }], sessionRows, setRows] = await Promise.all([
      this.prisma.$queryRaw<{ today: string }[]>`
        SELECT to_char(now() AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS today`,
      this.prisma.$queryRaw<SessionRow[]>`
        SELECT id::text,
               to_char(ended_at AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS date
        FROM workout_sessions
        WHERE user_id = ${user.id}::uuid
          AND ended_at IS NOT NULL
          AND deleted_at IS NULL
        ORDER BY ended_at, id`,
      // Working set chưa xoá của bài chưa xoá trong buổi đã kết thúc; bài không còn set
      // nào vẫn có một dòng (cột set null) để buổi không mất bài.
      this.prisma.$queryRaw<SetRow[]>`
        SELECT se.session_id::text, se.id::text AS row_id, sl.id::text AS set_id,
               se.exercise_id::text, se.load_input::text AS load_input,
               e.metric_type::text AS metric_type,
               sl.weight_value::float8 AS weight,
               sl.input_unit::text AS input_unit, sl.reps
        FROM session_exercises se
        JOIN workout_sessions ws ON ws.id = se.session_id
        JOIN exercises e ON e.id = se.exercise_id
        LEFT JOIN set_logs sl
          ON sl.session_exercise_id = se.id
         AND sl.set_type = 'working'
         AND sl.deleted_at IS NULL
        WHERE ws.user_id = ${user.id}::uuid
          AND ws.ended_at IS NOT NULL
          AND ws.deleted_at IS NULL
          AND se.deleted_at IS NULL
        ORDER BY se.position, sl.set_index`,
    ]);

    const exerciseIds = [...new Set(setRows.map((r) => r.exercise_id))];
    const muscleRows = exerciseIds.length
      ? await this.prisma.$queryRaw<MuscleRow[]>`
          SELECT em.exercise_id::text, m.muscle_group, em.role::text AS role
          FROM exercise_muscles em
          JOIN muscles m ON m.id = em.muscle_id
          WHERE em.exercise_id = ANY(${exerciseIds}::uuid[])`
      : [];

    const muscles = new Map<string, ProgressMuscle[]>();
    for (const row of muscleRows) {
      const list = muscles.get(row.exercise_id) ?? [];
      list.push({ group: row.muscle_group, role: row.role });
      muscles.set(row.exercise_id, list);
    }

    const sessions = new Map<string, ProgressSession>(
      sessionRows.map((s) => [s.id, { ...s, exercises: [] }]),
    );
    const rows = new Map<string, ProgressExercise>();
    for (const r of setRows) {
      let row = rows.get(r.row_id);
      if (!row) {
        row = {
          exerciseId: r.exercise_id,
          loadInput: r.load_input,
          metric: r.metric_type,
          muscles: muscles.get(r.exercise_id) ?? [],
          sets: [],
        };
        rows.set(r.row_id, row);
        sessions.get(r.session_id)?.exercises.push(row);
      }
      if (r.set_id === null) continue;
      row.sets.push({
        weightKg:
          r.weight === null
            ? null
            : r.input_unit === 'lb'
              ? r.weight * KG_PER_LB
              : r.weight,
        reps: r.reps,
      });
    }

    const progress = buildProgress({
      today,
      weeks: PROGRESS_WEEKS,
      months: PROGRESS_MONTHS,
      sessions: [...sessions.values()],
    });
    return {
      today,
      weeks: progress.weeks.map((w) => ({
        ...w,
        sets: Object.fromEntries(
          MUSCLE_GROUPS.map((g) => [g, w.sets[g] ?? 0]),
        ) as Record<MuscleGroup, number>,
      })),
      months: progress.months,
      e1rm: progress.e1rm,
    };
  }
}
