import type { CatalogExercise, RoutineExercise } from '@fitness/contract';
import { equipmentDefaults } from '@fitness/engine';
import { useLiveQuery } from 'dexie-react-hooks';
import * as React from 'react';

import { Stepper, SwitchRow } from '@/components/controls';
import { Field, InputRow, NumberInput } from '@/components/field';
import { SwapIcon, TrashIcon } from '@/components/icons';
import { Menu, MenuItem } from '@/components/menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatNumber, formatShortDate } from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import {
  type ExerciseTarget,
  formatSeconds,
  parseSeconds,
  targetChanges,
  targetOf,
} from '@/routines/display';
import { loadLabel } from '@/workout/display';
import { findLastTime } from '@/workout/last-time';

/** Hai đầu khoảng bị gõ ngược thì đổi chỗ (prototype đổi ngay khi gõ). */
function ordered(target: ExerciseTarget): ExerciseTarget {
  const next = { ...target };
  if (next.repMin !== null && next.repMax !== null && next.repMin > next.repMax) {
    [next.repMin, next.repMax] = [next.repMax, next.repMin];
  }
  const { targetDurationMinS: a, targetDurationMaxS: b } = next;
  if (a !== null && b !== null && a > b) {
    next.targetDurationMinS = b;
    next.targetDurationMaxS = a;
  }
  return next;
}

/** Ô thời gian "m:ss": gõ 45 là 0:45, 130 là 1:30; rời ô thì hiện lại dạng m:ss. */
function SecondsInput({
  value,
  onValueChange,
  'aria-label': ariaLabel,
}: {
  value: number;
  onValueChange: (seconds: number) => void;
  'aria-label': string;
}) {
  const [text, setText] = React.useState<string | null>(null);
  return (
    <Input
      aria-label={ariaLabel}
      inputMode="numeric"
      autoComplete="off"
      className="w-24 text-center text-num leading-none numeral"
      value={text ?? formatSeconds(value)}
      onFocus={() => setText(formatSeconds(value))}
      onChange={(event) => {
        setText(event.target.value);
        const seconds = parseSeconds(event.target.value);
        if (seconds) onValueChange(seconds);
      }}
      onBlur={() => setText(null)}
    />
  );
}

/**
 * Sheet chỉnh một bài trong ngày tập (prototypes/plans › exSheet): số set, rep range (hoặc
 * thời gian), tạ khởi điểm, khởi động, nghỉ; đổi bài, bỏ bài. Thay đổi lưu một lần khi
 * đóng sheet (`onSave` nhận các trường đã đổi).
 */
export function ExerciseSheet({
  row,
  exercise,
  name,
  dayName,
  onClose,
  onSave,
  onChangeExercise,
  onRemove,
}: {
  /** Bài đang chỉnh; `null` thì sheet đóng. */
  row: RoutineExercise | null;
  exercise: CatalogExercise | undefined;
  name: string;
  dayName: string;
  onClose: () => void;
  onSave: (row: RoutineExercise, changes: Partial<ExerciseTarget>) => void;
  /** Lưu thay đổi đang có rồi mở picker đổi bài. */
  onChangeExercise: (row: RoutineExercise) => void;
  onRemove: (row: RoutineExercise) => void;
}) {
  const [draft, setDraft] = React.useState<ExerciseTarget | null>(null);
  const [rowId, setRowId] = React.useState<string | null>(null);
  // Mở sheet cho bài khác thì nạp lại từ bài đó.
  if (row && row.id !== rowId) {
    setRowId(row.id);
    setDraft(targetOf(row));
  }
  const target = row && draft ? draft : null;

  const lastTime = useLiveQuery(
    () => (row ? findLastTime(row.exerciseId) : null),
    [row?.exerciseId],
  );

  /** Thay đổi so với bài lúc mở sheet. */
  const pending = () =>
    row && target ? targetChanges(targetOf(row), ordered(target)) : {};

  const close = () => {
    if (row) {
      const changes = pending();
      if (Object.keys(changes).length > 0) onSave(row, changes);
    }
    setRowId(null);
    onClose();
  };

  const set = (change: Partial<ExerciseTarget>) =>
    setDraft((d) => (d ? { ...d, ...change } : d));

  const metric = exercise?.metricType ?? 'weight_reps';
  const load = equipmentDefaults(exercise?.equipment ?? null).loadInput;
  const repHelp =
    metric === 'weight_reps'
      ? m.ex_rep_help_weight()
      : load === 'added_weight'
        ? m.ex_rep_help_added()
        : m.ex_rep_help_reps();
  const firstWeight = lastTime?.sets[0]?.weight;

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && close()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
        </SheetHeader>
        {row && target && (
          <SheetBody>
            <Field label={m.ex_working_sets()}>
              <Stepper
                aria-label={m.ex_working_sets()}
                value={target.targetSets}
                min={1}
                max={20}
                onValueChange={(targetSets) => set({ targetSets })}
                decreaseLabel={m.ex_set_fewer()}
                increaseLabel={m.ex_set_more()}
              />
            </Field>
            {target.targetDurationMinS !== null &&
            target.targetDurationMaxS !== null ? (
              <Field label={m.ex_time_range()} help={m.ex_time_help()}>
                <div className="flex items-center gap-2">
                  <SecondsInput
                    aria-label={m.ex_time_min()}
                    value={target.targetDurationMinS}
                    onValueChange={(targetDurationMinS) =>
                      set({ targetDurationMinS })
                    }
                  />
                  <span className="text-num numeral">–</span>
                  <SecondsInput
                    aria-label={m.ex_time_max()}
                    value={target.targetDurationMaxS}
                    onValueChange={(targetDurationMaxS) =>
                      set({ targetDurationMaxS })
                    }
                  />
                </div>
              </Field>
            ) : target.repMin !== null && target.repMax !== null ? (
              <Field label={m.ex_rep_range()} help={repHelp}>
                <div className="flex items-center gap-2">
                  <NumberInput
                    aria-label={m.ex_reps_min()}
                    maxFractionDigits={0}
                    value={target.repMin}
                    onValueChange={(v) =>
                      v !== null && v >= 1 && set({ repMin: Math.round(v) })
                    }
                  />
                  <span className="text-num numeral">–</span>
                  <NumberInput
                    aria-label={m.ex_reps_max()}
                    maxFractionDigits={0}
                    value={target.repMax}
                    onValueChange={(v) =>
                      v !== null && v >= 1 && set({ repMax: Math.round(v) })
                    }
                  />
                </div>
              </Field>
            ) : null}
            {metric === 'weight_reps' && (
              <Field
                label={m.ex_start_weight()}
                help={
                  lastTime && firstWeight != null
                    ? m.ex_start_last({
                        weight: formatNumber(firstWeight),
                        date: formatShortDate(new Date(lastTime.startedAt)),
                      })
                    : m.ex_start_none()
                }
              >
                <InputRow>
                  <NumberInput
                    placeholder="–"
                    value={target.initialWeightKg}
                    onValueChange={(initialWeightKg) =>
                      set({ initialWeightKg })
                    }
                  />
                  <span className="label-caps">
                    {m.ex_start_weight_unit({
                      load: loadLabel(load).toLowerCase(),
                    })}
                  </span>
                </InputRow>
              </Field>
            )}
            {metric === 'weight_reps' && (
              <div className="border-t border-rule-soft py-3">
                <SwitchRow
                  label={m.ex_warmup()}
                  sub={m.ex_warmup_hint()}
                  checked={!!target.warmupEnabled}
                  onCheckedChange={(warmupEnabled) => set({ warmupEnabled })}
                />
              </div>
            )}
            <Field label={m.ex_rest()}>
              <Stepper
                aria-label={m.ex_rest()}
                value={target.restSeconds}
                step={15}
                min={15}
                max={1800}
                format={formatSeconds}
                onValueChange={(restSeconds) => set({ restSeconds })}
                decreaseLabel={m.ex_rest_less()}
                increaseLabel={m.ex_rest_more()}
              />
            </Field>
            <Menu className="mt-1 border-t border-rule-soft">
              <MenuItem
                icon={<SwapIcon aria-hidden />}
                sub={m.ex_change_hint()}
                onClick={() => {
                  const changes = pending();
                  if (Object.keys(changes).length > 0) onSave(row, changes);
                  setRowId(null);
                  onChangeExercise(row);
                }}
              >
                {m.ex_change()}
              </MenuItem>
              <MenuItem
                danger
                icon={<TrashIcon aria-hidden />}
                onClick={() => {
                  setRowId(null);
                  onRemove(row);
                }}
              >
                {m.ex_remove({ day: dayName })}
              </MenuItem>
            </Menu>
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
