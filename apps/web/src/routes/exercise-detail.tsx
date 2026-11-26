import { hasWeightSettings, type Metric } from '@fitness/engine';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router';

import {
  equipmentLabel,
  exerciseNames,
  primaryMuscles,
} from '@/catalog/display';
import { AppShell, SectionHeading, TopBar } from '@/components/app-shell';
import { Block, Row, RowTitle, RowValue } from '@/components/block';
import { EmptyState } from '@/components/empty-state';
import { Field, InputRow, TextInput } from '@/components/field';
import { CloseIcon } from '@/components/icons';
import { SyncPill } from '@/components/sync-pill';
import { Button } from '@/components/ui/button';
import { db } from '@/db/db';
import { useComingSoon } from '@/hooks/use-coming-soon';
import { formatShortDate } from '@/lib/format';
import { getLocale } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';
import { pastSetTexts } from '@/workout/display';
import { ExerciseSettingsFields } from '@/workout/exercise-settings-fields';
import { findLastTime } from '@/workout/last-time';
import { useExerciseSettings } from '@/workout/session';

/** "reps", "time"… cho câu "Logged as …" của bài không có cài đặt tạ. */
function metricText(metric: Metric): string {
  switch (metric) {
    case 'weight_reps':
    case 'reps':
      return m.exercise_metric_reps();
    case 'duration':
      return m.exercise_metric_duration();
    case 'distance':
      return m.exercise_metric_distance();
  }
}

/**
 * Chi tiết bài trong thư viện (prototypes/plans › exerciseView): tên và alias, cài đặt riêng
 * của bài (UC14, ghi qua outbox nên chỉnh được khi offline) và lần tập gần nhất. Đọc bài từ
 * cache catalog trên máy.
 */
export function ExerciseDetailPage() {
  const { exerciseId = '' } = useParams();
  const exercise = useLiveQuery(
    async () => (await db.exercises.get(exerciseId)) ?? null,
    [exerciseId],
  );
  const settings = useExerciseSettings(exercise ?? undefined);
  const lastTime = useLiveQuery(() => findLastTime(exerciseId), [exerciseId]);
  // #19
  const editAlias = useComingSoon();
  // #33
  const openHistory = useComingSoon();

  if (exercise === undefined) return null;
  if (exercise === null) {
    return (
      <AppShell
        top={
          <TopBar
            title={m.plans_exercises_heading()}
            backTo="/plans/exercises"
          />
        }
      >
        <EmptyState>{m.exercise_not_found()}</EmptyState>
      </AppShell>
    );
  }

  const locale = getLocale();
  const { name, other } = exerciseNames(exercise, locale);
  const sub = [
    exercise.equipment && equipmentLabel(exercise.equipment),
    primaryMuscles(exercise, locale).join(', '),
  ]
    .filter(Boolean)
    .join(' · ');
  const metric = exercise.metricType;
  const weighted = hasWeightSettings(metric, settings.loadInput);
  const kind = metric === 'reps' ? 'reps' : 'weight_reps';
  const changedLoad =
    lastTime && settings && lastTime.loadInput !== settings.loadInput;

  return (
    <AppShell
      top={
        <TopBar
          title={name}
          sub={sub}
          backTo="/plans/exercises"
          right={<SyncPill />}
        />
      }
    >
      <Block pad>
        <b className="block text-read">{name}</b>
        <span className="text-label font-semibold">
          {[other, exercise.mine && m.exercise_mine()]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <Field label={m.exercise_names()} className="mt-3">
          <div className="mt-1 flex flex-wrap gap-1.5">
            {exercise.aliases.map((a) => (
              <span
                key={`${a.lang}-${a.alias}`}
                className={
                  a.mine
                    ? 'inline-flex h-8 items-center gap-1 rounded-full border-[1.5px] border-ink pr-1 pl-2.5 text-label font-semibold'
                    : 'inline-flex h-8 items-center rounded-full border-[1.5px] border-rule px-2.5 text-label font-semibold'
                }
              >
                {a.alias}
                {a.mine && (
                  <button
                    type="button"
                    className="grid size-7 place-items-center"
                    aria-label={m.exercise_alias_remove({ alias: a.alias })}
                    onClick={editAlias}
                  >
                    <CloseIcon className="size-3.5" aria-hidden />
                  </button>
                )}
              </span>
            ))}
          </div>
          <InputRow className="mt-2">
            <TextInput
              aria-label={m.exercise_names()}
              placeholder={m.exercise_alias_placeholder()}
              className="flex-1"
            />
            <Button variant="line" onClick={editAlias}>
              {m.exercise_alias_add()}
            </Button>
          </InputRow>
        </Field>
      </Block>

      {weighted ? (
        <>
          <SectionHeading>{m.exercise_how()}</SectionHeading>
          <Block pad>
            {settings && (
              <ExerciseSettingsFields
                exercise={exercise}
                settings={settings}
                withBar
                loadHelp={
                  changedLoad
                    ? m.settings_load_changed()
                    : m.settings_load_help()
                }
              />
            )}
          </Block>
        </>
      ) : (
        settings && (
          <p className="px-1 pt-3 text-label font-semibold">
            {m.exercise_no_weight({ metric: metricText(metric) })}
          </p>
        )
      )}

      <SectionHeading>{m.exercise_history()}</SectionHeading>
      <Block>
        {lastTime ? (
          <Row asChild>
            <button type="button" onClick={openHistory}>
              <RowTitle sub={m.exercise_last_hint()}>
                {m.log_last_time({
                  date: formatShortDate(new Date(lastTime.startedAt)),
                })}
              </RowTitle>
              <RowValue>
                {pastSetTexts(kind, lastTime.sets).join(' · ')}
              </RowValue>
            </button>
          </Row>
        ) : (
          <Row>
            <RowTitle sub={m.exercise_not_logged_hint()}>
              {m.exercise_not_logged()}
            </RowTitle>
          </Row>
        )}
      </Block>
    </AppShell>
  );
}
