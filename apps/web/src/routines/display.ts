import type {
  AddRoutineExerciseRequest,
  CatalogExercise,
  MetricType,
  RoutineExercise,
} from '@fitness/contract';

import { formatElapsed, formatNumber } from '@/lib/format';
import { m } from '@/paraglide/messages.js';

/** Target của bài trong ngày tập, không gồm id và thứ tự. */
export type ExerciseTarget = Omit<
  RoutineExercise,
  'id' | 'position' | 'supersetGroup'
>;

/**
 * Target mặc định khi thêm bài vào ngày tập (prototypes/plans › choose): 3 set, 8–12 rep,
 * nghỉ 90 giây. Bài đo thời gian dùng khoảng 0:30–1:00 thay rep range; bài đo quãng
 * đường chỉ có số set.
 */
export function defaultTarget(
  exerciseId: string,
  metricType: MetricType,
): AddRoutineExerciseRequest {
  const timed = metricType === 'duration';
  const reps = metricType === 'weight_reps' || metricType === 'reps';
  return {
    exerciseId,
    targetSets: 3,
    repMin: reps ? 8 : null,
    repMax: reps ? 12 : null,
    targetDurationMinS: timed ? 30 : null,
    targetDurationMaxS: timed ? 60 : null,
    initialWeightKg: null,
    // null = theo mặc định khởi động của user (D22, SDD 7.1 › warmup_enabled).
    warmupEnabled: null,
    restSeconds: 90,
  };
}

/** Loại target: rep range, thời gian mỗi set, hay chỉ số set (bài đo quãng đường). */
function targetKind(target: Pick<ExerciseTarget, 'repMin' | 'targetDurationMinS'>) {
  if (target.targetDurationMinS !== null) return 'time';
  return target.repMin !== null ? 'reps' : 'sets';
}

/**
 * Sửa đổi khi đổi bài trong ngày tập (prototype: "Keeps sets, reps and rest"): bỏ tạ khởi
 * điểm; bài mới đo khác loại (vd tạ × reps sang thời gian) thì lấy khoảng target mặc định
 * của loại mới thay vì giữ khoảng không dùng được.
 */
export function swapChanges(
  current: ExerciseTarget,
  next: Pick<CatalogExercise, 'id' | 'metricType'>,
): Partial<ExerciseTarget> {
  const fresh = defaultTarget(next.id, next.metricType);
  const changes: Partial<ExerciseTarget> = {
    exerciseId: next.id,
    initialWeightKg: null,
  };
  if (targetKind(current) !== targetKind(fresh)) {
    changes.repMin = fresh.repMin;
    changes.repMax = fresh.repMax;
    changes.targetDurationMinS = fresh.targetDurationMinS;
    changes.targetDurationMaxS = fresh.targetDurationMaxS;
  }
  return changes;
}

/** Target của một bài trong ngày tập (bỏ id, thứ tự, superset). */
export function targetOf(row: RoutineExercise): ExerciseTarget {
  return {
    exerciseId: row.exerciseId,
    targetSets: row.targetSets,
    repMin: row.repMin,
    repMax: row.repMax,
    targetDurationMinS: row.targetDurationMinS,
    targetDurationMaxS: row.targetDurationMaxS,
    initialWeightKg: row.initialWeightKg,
    warmupEnabled: row.warmupEnabled,
    restSeconds: row.restSeconds,
  };
}

/** Thời gian "m:ss" (vd 90 giây → "1:30"). */
export function formatSeconds(seconds: number): string {
  return formatElapsed(seconds * 1000);
}

/**
 * Đọc thời gian user gõ (prototypes/shared/kit.js › parseDur): "1:30", hoặc chỉ chữ số với
 * hai số cuối là giây ("45" → 0:45, "130" → 1:30). Không đọc được: `null`.
 */
export function parseSeconds(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (text.includes(':')) {
    const [min, sec] = text.split(':').map((x) => parseInt(x || '0', 10));
    return Number.isFinite(min) && Number.isFinite(sec) ? min * 60 + sec : null;
  }
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  return digits.length <= 2
    ? Number(digits)
    : Number(digits.slice(0, -2)) * 60 + Number(digits.slice(-2));
}

/** "3 × 8–12", "3 × 0:30–1:00", hoặc "3 sets" cho bài đo quãng đường. */
export function targetText(target: ExerciseTarget): string {
  const { targetSets: sets } = target;
  if (target.targetDurationMinS !== null && target.targetDurationMaxS !== null) {
    return m.routine_spec_range({
      sets,
      min: formatSeconds(target.targetDurationMinS),
      max: formatSeconds(target.targetDurationMaxS),
    });
  }
  if (target.repMin !== null && target.repMax !== null) {
    return m.routine_spec_range({
      sets,
      min: formatNumber(target.repMin),
      max: formatNumber(target.repMax),
    });
  }
  return m.routine_spec_sets({ count: sets });
}

/**
 * Dòng target của bài trong ngày tập (prototypes/plans › exSpec): target, nghỉ, khởi động
 * và điểm khởi đầu của set đầu tiên.
 */
export function targetParts(
  target: ExerciseTarget,
  exercise: Pick<CatalogExercise, 'metricType' | 'equipment'> | undefined,
  hasHistory: boolean,
): string[] {
  const parts = [
    targetText(target),
    m.routine_spec_rest({ time: formatSeconds(target.restSeconds) }),
  ];
  if (target.warmupEnabled) parts.push(m.routine_spec_warmup());
  const metric = exercise?.metricType ?? 'weight_reps';
  if (metric === 'weight_reps' && target.initialWeightKg !== null) {
    parts.push(
      m.routine_spec_start_weight({
        weight: formatNumber(target.initialWeightKg),
      }),
    );
  } else if (hasHistory) {
    parts.push(m.routine_spec_start_last());
  } else if (metric === 'reps' && exercise?.equipment === 'body only') {
    parts.push(m.routine_spec_bodyweight());
  } else {
    parts.push(m.routine_spec_first_by_feel());
  }
  return parts;
}

/** Tên ngày mặc định "Day N" theo ngôn ngữ UI. */
export function defaultDayName(n: number): string {
  return m.routine_day_default_name({ n });
}

/** Số working set của một ngày tập. */
export function workingSets(exercises: Pick<RoutineExercise, 'targetSets'>[]) {
  return exercises.reduce((sum, e) => sum + e.targetSets, 0);
}

/** Phần sửa đổi của `next` so với `prev` (chỉ các trường target khác nhau). */
export function targetChanges(
  prev: ExerciseTarget,
  next: ExerciseTarget,
): Partial<ExerciseTarget> {
  const changes: Partial<ExerciseTarget> = {};
  for (const key of Object.keys(next) as (keyof ExerciseTarget)[]) {
    if (next[key] !== prev[key]) {
      (changes as Record<string, unknown>)[key] = next[key];
    }
  }
  return changes;
}
