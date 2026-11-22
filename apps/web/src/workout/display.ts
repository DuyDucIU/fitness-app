import type { LoadInput } from '@fitness/contract';
import type { PastSet } from '@fitness/engine';

import { exerciseNames } from '@/catalog/display';
import { formatNumber } from '@/lib/format';
import { getLocale } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';
import type { WorkoutExercise } from '@/workout/session';

/** Cách hiển thị bài và set, dùng chung cho màn ghi buổi tập và lịch sử. */

/** Bài ghi bằng tạ × reps, chỉ reps, hay chưa ghi được (thời gian, quãng đường — #13). */
export type LogKind = 'weight_reps' | 'reps' | 'unsupported';

export function logKind(item: WorkoutExercise): LogKind {
  const metric = item.exercise?.metricType ?? 'weight_reps';
  return metric === 'weight_reps' || metric === 'reps' ? metric : 'unsupported';
}

export function exerciseName(item: WorkoutExercise): string {
  return item.exercise
    ? exerciseNames(item.exercise, getLocale()).name
    : m.log_unknown_exercise();
}

/** "80 × 8", "12 reps"; số chưa có hiện "–". */
export function setText(
  kind: LogKind,
  weight: number | null,
  reps: number | null,
): string {
  const r = reps ?? '–';
  if (kind === 'reps') return `${r} ${m.log_unit_reps()}`;
  return `${weight === null ? '–' : formatNumber(weight)} × ${r}`;
}

/**
 * Các set của lần trước, mỗi set một mục, như prototype: chỉ ghi mức tạ khi khác set
 * trước, nên cùng mức tạ là ["80×8", "8", "7"], đổi mức là ["100×3", "95×4", "80×10",
 * "8"]; bài chỉ reps ["12", "10", "9"]. Dấu × sát hai số để mỗi cặp đọc là một set.
 */
export function pastSetTexts(kind: LogKind, sets: PastSet[]): string[] {
  return sets.map((s, i) => {
    const reps = String(s.reps ?? '–');
    if (kind === 'reps' || (i > 0 && s.weight === sets[i - 1].weight)) {
      return reps;
    }
    return `${s.weight === null ? '–' : formatNumber(s.weight)}×${reps}`;
  });
}

/** Quy ước ghi tạ đã dịch (SRS Phụ lục B). */
export function loadLabel(loadInput: LoadInput): string {
  switch (loadInput) {
    case 'total':
      return m.log_load_total();
    case 'per_side':
      return m.log_load_per_side();
    case 'per_dumbbell':
      return m.log_load_per_dumbbell();
    case 'stack':
      return m.log_load_stack();
    case 'added_weight':
      return m.log_load_added_weight();
  }
}
