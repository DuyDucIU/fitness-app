import type { Metric } from './before-session';
import type { LoadInput } from './equipment';
import { E1RM_MAX_REPS, e1rm } from './records';

/** Một working set chưa xoá; tạ đã quy về kg theo `input_unit` của set. */
export interface ProgressSet {
  weightKg: number | null;
  reps: number | null;
}

/** Nhóm cơ của bài (`MUSCLES.muscle_group`) qua một cơ, kèm vai trò của cơ đó. */
export interface ProgressMuscle {
  group: string;
  role: 'primary' | 'secondary';
}

/** Một lần của bài trong buổi, chỉ gồm working set chưa xoá. */
export interface ProgressExercise {
  exerciseId: string;
  loadInput: LoadInput;
  metric: Metric;
  muscles: ProgressMuscle[];
  sets: ProgressSet[];
}

/** Buổi đã kết thúc, chưa xoá. `date`: ngày `ended_at` theo múi giờ của user (YYYY-MM-DD). */
export interface ProgressSession {
  id: string;
  date: string;
  exercises: ProgressExercise[];
}

export interface ProgressInput {
  /** Hôm nay theo múi giờ của user (YYYY-MM-DD); engine không đọc đồng hồ. */
  today: string;
  /** Số tuần trả về, tính cả tuần này. */
  weeks: number;
  /** Số tháng trả về, tính cả tháng này. */
  months: number;
  sessions: ProgressSession[];
}

/** Một tuần ISO (thứ Hai – Chủ nhật): số buổi và số working set theo nhóm cơ. */
export interface ProgressWeek {
  /** Thứ Hai đầu tuần (YYYY-MM-DD). */
  start: string;
  workouts: number;
  /** Nhóm cơ → số set; nhóm không có set thì vắng mặt. */
  sets: Record<string, number>;
}

export interface ProgressMonth {
  /** Ngày 1 của tháng (YYYY-MM-DD). */
  start: string;
  workouts: number;
}

/** Điểm e1RM của một buổi: set có e1RM cao nhất trong các set tối đa 12 reps. */
export interface E1rmPoint {
  sessionId: string;
  date: string;
  e1rmKg: number;
  weightKg: number;
  reps: number;
}

/** Đường e1RM của một bài với một cách ghi tạ (D15: không gộp các cách ghi). */
export interface E1rmSeries {
  exerciseId: string;
  loadInput: LoadInput;
  points: E1rmPoint[];
}

export interface Progress {
  weeks: ProgressWeek[];
  months: ProgressMonth[];
  e1rm: E1rmSeries[];
}

const DAY_MS = 86_400_000;
const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Thứ Hai đầu tuần ISO chứa `date`. */
function weekStart(date: string): string {
  const ms = toUtc(date);
  const weekday = (new Date(ms).getUTCDay() + 6) % 7; // thứ Hai = 0
  return fromUtc(ms - weekday * DAY_MS);
}

const monthStart = (date: string) => `${date.slice(0, 7)}-01`;

/** Ngày 1 của tháng cách tháng của `date` `offset` tháng. */
function addMonths(date: string, offset: number): string {
  const d = new Date(toUtc(monthStart(date)));
  d.setUTCMonth(d.getUTCMonth() + offset);
  return fromUtc(d.getTime());
}

/**
 * Trọng số một set cho từng nhóm cơ: 1 nếu bài có cơ chính thuộc nhóm, 0,5 nếu nhóm chỉ có
 * cơ phụ (cách đếm "fractional", Pelland và cs. 2024). Mỗi nhóm tính một lần mỗi set.
 */
function groupWeights(muscles: ProgressMuscle[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const { group, role } of muscles) {
    const weight = role === 'primary' ? 1 : 0.5;
    weights.set(group, Math.max(weights.get(group) ?? 0, weight));
  }
  return weights;
}

/** Set có e1RM cao nhất trong các set có tạ và 1–12 reps; không có thì `null`. */
function bestSet(
  sets: ProgressSet[],
): Omit<E1rmPoint, 'sessionId' | 'date'> | null {
  let best: Omit<E1rmPoint, 'sessionId' | 'date'> | null = null;
  for (const { weightKg, reps } of sets) {
    if (!weightKg || weightKg <= 0 || !reps || reps <= 0) continue;
    if (reps > E1RM_MAX_REPS) continue;
    const value = e1rm(weightKg, reps);
    if (!best || value > best.e1rmKg) best = { e1rmKg: value, weightKg, reps };
  }
  return best;
}

/**
 * Số liệu biểu đồ tiến độ (UC19) từ các buổi đã kết thúc:
 * - tần suất: số buổi mỗi tuần ISO và mỗi tháng, theo ngày kết thúc buổi;
 * - working set mỗi tuần theo nhóm cơ (đếm set, không cộng kg — D16), cơ phụ tính nửa set;
 * - e1RM (Epley) mỗi buổi theo bài × cách ghi tạ, chỉ bài tạ × reps, toàn bộ lịch sử.
 */
export function buildProgress(input: ProgressInput): Progress {
  const thisWeek = weekStart(input.today);
  const weeks: ProgressWeek[] = Array.from({ length: input.weeks }, (_, i) => ({
    start: fromUtc(toUtc(thisWeek) - (input.weeks - 1 - i) * 7 * DAY_MS),
    workouts: 0,
    sets: {},
  }));
  const months: ProgressMonth[] = Array.from(
    { length: input.months },
    (_, i) => ({
      start: addMonths(input.today, i - (input.months - 1)),
      workouts: 0,
    }),
  );
  const weekOf = new Map(weeks.map((w) => [w.start, w]));
  const monthOf = new Map(months.map((m) => [m.start, m]));
  const series = new Map<string, E1rmSeries>();

  const sessions = [...input.sessions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  for (const session of sessions) {
    const month = monthOf.get(monthStart(session.date));
    if (month) month.workouts += 1;
    const week = weekOf.get(weekStart(session.date));
    if (week) {
      week.workouts += 1;
      for (const exercise of session.exercises) {
        for (const [group, weight] of groupWeights(exercise.muscles)) {
          week.sets[group] =
            (week.sets[group] ?? 0) + weight * exercise.sets.length;
        }
      }
    }

    // Bài thêm hai lần trong buổi cùng cách ghi tạ: gộp set rồi lấy một điểm.
    const byKey = new Map<string, ProgressExercise[]>();
    for (const exercise of session.exercises) {
      if (exercise.metric !== 'weight_reps') continue;
      const key = `${exercise.exerciseId} ${exercise.loadInput}`;
      byKey.set(key, [...(byKey.get(key) ?? []), exercise]);
    }
    for (const [key, rows] of byKey) {
      const [first] = rows;
      const best = bestSet(rows.flatMap((r) => r.sets));
      if (!first || !best) continue;
      const line = series.get(key) ?? {
        exerciseId: first.exerciseId,
        loadInput: first.loadInput,
        points: [],
      };
      series.set(key, line);
      line.points.push({ sessionId: session.id, date: session.date, ...best });
    }
  }

  return {
    weeks,
    months,
    e1rm: [...series.values()],
  };
}
