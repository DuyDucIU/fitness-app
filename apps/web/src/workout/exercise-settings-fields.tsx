import type { CatalogExercise, LoadInput } from '@fitness/contract';
import {
  type ExerciseSettings,
  hasWeightSettings,
  LOAD_INPUTS,
  stepChoices,
} from '@fitness/engine';

import { Segmented, SwitchRow } from '@/components/controls';
import { Field } from '@/components/field';
import { formatNumber } from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import { saveExerciseSettings } from '@/workout/session';

/** Nhãn ô chọn quy ước ghi tạ (prototype › LOAD), viết hoa đầu như nút. */
function loadOptionLabel(load: LoadInput): string {
  switch (load) {
    case 'total':
      return m.settings_load_total();
    case 'per_side':
      return m.settings_load_per_side();
    case 'per_dumbbell':
      return m.settings_load_per_dumbbell();
    case 'stack':
      return m.settings_load_stack();
    case 'added_weight':
      return m.settings_load_added_weight();
  }
}

/** Mức đòn chọn được (prototypes/plans › exerciseView); 0 là "None" (lưu `null`). */
const BAR_WEIGHTS = [0, 10, 15, 20] as const;

/** Dụng cụ có đòn: tạ đòn, và thanh EZ (thanh rời, user tự đặt đòn, SDD 7.2). */
const BAR_EQUIPMENT = new Set(['barbell', 'e-z curl bar']);

/**
 * Các ô cài đặt riêng của một bài (UC08, UC14): bậc tạ, quy ước ghi tạ, trọng lượng đòn,
 * tự chạy rest timer. Mỗi lần đổi lưu ngay cả dòng qua outbox (`saveExerciseSettings`),
 * nên chỉnh được khi offline. Dùng ở menu bài trên màn ghi set và ở chi tiết bài trong thư
 * viện; màn ghi set không có ô đòn (prototypes/workout-log › exMenu).
 */
export function ExerciseSettingsFields({
  exercise,
  settings,
  withBar,
  loadHelp,
}: {
  exercise: Pick<CatalogExercise, 'id' | 'equipment' | 'metricType'>;
  settings: ExerciseSettings;
  /** Hiện ô trọng lượng đòn (khi ghi tổng tạ với dụng cụ có đòn). */
  withBar?: boolean;
  /** Dòng giải thích dưới ô quy ước ghi tạ. */
  loadHelp?: string;
}) {
  const save = (change: Partial<ExerciseSettings>) =>
    void saveExerciseSettings(exercise, change);
  const weighted = hasWeightSettings(exercise.metricType, settings.loadInput);
  const showBar =
    withBar &&
    settings.loadInput === 'total' &&
    exercise.equipment !== null &&
    BAR_EQUIPMENT.has(exercise.equipment);
  const bars: number[] = [...BAR_WEIGHTS];
  const bar = settings.barWeightKg ?? 0;
  if (!bars.includes(bar)) bars.push(bar);
  bars.sort((a, b) => a - b);

  return (
    <>
      {weighted && (
        <Field
          label={
            settings.loadInput === 'added_weight'
              ? m.settings_step_added()
              : m.settings_step()
          }
          help={withBar ? m.settings_step_help() : undefined}
        >
          <Segmented
            aria-label={
              settings.loadInput === 'added_weight'
                ? m.settings_step_added()
                : m.settings_step()
            }
            value={String(settings.stepKg)}
            onValueChange={(v) => save({ stepKg: Number(v) })}
            options={stepChoices(settings.stepKg).map((step) => ({
              value: String(step),
              label: m.settings_kg({ value: formatNumber(step) }),
            }))}
          />
        </Field>
      )}
      {exercise.metricType === 'weight_reps' && (
        <Field label={m.settings_load()} help={loadHelp}>
          <Segmented
            aria-label={m.settings_load()}
            value={settings.loadInput}
            onValueChange={(loadInput) => save({ loadInput })}
            options={LOAD_INPUTS.map((load) => ({
              value: load,
              label: loadOptionLabel(load),
            }))}
          />
        </Field>
      )}
      {showBar && (
        <Field label={m.settings_bar()} help={m.settings_bar_help()}>
          <Segmented
            aria-label={m.settings_bar()}
            value={String(bar)}
            onValueChange={(v) => save({ barWeightKg: Number(v) || null })}
            options={bars.map((kg) => ({
              value: String(kg),
              label: kg
                ? m.settings_kg({ value: formatNumber(kg) })
                : m.settings_bar_none(),
            }))}
          />
        </Field>
      )}
      <div className="border-t border-rule-soft py-3">
        <SwitchRow
          label={m.settings_auto_rest()}
          checked={settings.restAutoStart}
          onCheckedChange={(restAutoStart) => save({ restAutoStart })}
        />
      </div>
    </>
  );
}
