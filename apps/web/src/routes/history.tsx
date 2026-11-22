import type { WorkoutSession } from '@fitness/contract';
import { Link, useParams } from 'react-router';

import { equipmentLabel } from '@/catalog/display';
import { AppShell, TopBar } from '@/components/app-shell';
import { Block, Row, RowEnd, RowKey, RowValue } from '@/components/block';
import { Chip, ChipRow } from '@/components/chip';
import { Subtabs } from '@/components/controls';
import { EmptyState } from '@/components/empty-state';
import {
  ChevronIcon,
  MoreIcon,
  PlayIcon,
  SearchIcon,
} from '@/components/icons';
import { SyncPill } from '@/components/sync-pill';
import { Button } from '@/components/ui/button';
import { useComingSoon } from '@/hooks/use-coming-soon';
import {
  formatLongDate,
  formatNumber,
  formatShortDate,
  formatTime,
  formatWeekdayShort,
} from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import { RootScreen } from '@/routes/root-screens';
import { exerciseName, loadLabel, logKind, setText } from '@/workout/display';
import {
  groupByWeek,
  type HistoryWorkout,
  useFinishedWorkout,
  useHistory,
} from '@/workout/history';
import type { WorkoutExercise } from '@/workout/session';

/** Tên buổi: tên ngày tập, hoặc "Tập tự do". Chưa có routine trên máy nên chưa có tên ngày. */
function workoutName(session: WorkoutSession): string {
  return session.routineDayId === null
    ? m.log_freestyle()
    : m.history_routine_workout();
}

/** Workouts | PRs. Màn PR theo bài làm ở #33, tới lúc đó báo "Coming soon". */
function HistoryTabs() {
  const comingSoon = useComingSoon();
  return (
    <Subtabs
      aria-label={m.history_tabs_label()}
      items={[
        { to: '/history', label: m.history_tab_workouts() },
        { onClick: comingSoon, label: m.history_tab_prs() },
      ]}
    />
  );
}

/** Lọc theo bài và khoảng ngày (#33): hiện đủ chip như prototype, chưa lọc được thì báo. */
function HistoryFilters() {
  const comingSoon = useComingSoon();
  return (
    <ChipRow
      role="group"
      aria-label={m.history_filters_label()}
      className="flex-none px-3 pb-2"
    >
      <Chip className="h-10" onClick={comingSoon}>
        <SearchIcon className="size-5" aria-hidden />
        {m.history_filter_exercise()}
      </Chip>
      <Chip className="h-10" pressed={false} onClick={comingSoon}>
        {m.history_filter_4w()}
      </Chip>
      <Chip className="h-10" pressed={false} onClick={comingSoon}>
        {m.history_filter_3m()}
      </Chip>
      <Chip className="h-10" pressed>
        {m.history_filter_all()}
      </Chip>
    </ChipRow>
  );
}

/**
 * History › Workouts (prototypes/history, UC20 bước 1): các buổi đã kết thúc, mới nhất
 * trước, nhóm theo tuần (thứ Hai – Chủ nhật), gồm cả buổi kéo về từ server. Số buổi so với
 * mục tiêu tuần (#36, #37), PR (#33) và deload (#30) hiện khi có các tính năng đó.
 */
export function HistoryPage() {
  const workouts = useHistory();
  const empty = workouts?.length === 0;
  return (
    <RootScreen
      title={m.nav_history()}
      banner={
        <>
          <HistoryTabs />
          {!empty && <HistoryFilters />}
        </>
      }
    >
      {empty && (
        <section className="overflow-hidden rounded-md bg-tyvek">
          <div className="flex min-h-14 items-center px-4 py-1.5 label-caps shadow-[inset_0_0_0_2px_var(--color-ink)]">
            {m.history_empty_title()}
          </div>
          <EmptyState
            stat={0}
            action={
              <Button asChild variant="ink">
                <Link to="/">
                  <PlayIcon aria-hidden />
                  {m.history_go_today()}
                </Link>
              </Button>
            }
          >
            {m.history_empty_body()}
          </EmptyState>
        </section>
      )}
      {!!workouts?.length && <WeekList workouts={workouts} />}
    </RootScreen>
  );
}

function WeekList({ workouts }: { workouts: HistoryWorkout[] }) {
  // Thanh dưới tên buổi: độ dài buổi so với buổi dài nhất.
  const longest = Math.max(1, ...workouts.map((w) => w.minutes));
  return groupByWeek(workouts).map((week) => {
    const start = formatShortDate(week.start);
    const end = formatShortDate(week.end);
    return (
      <section key={week.start.getTime()}>
        <h2 className="flex items-baseline gap-2 px-1 pt-1.5 pb-1.5 text-label font-bold tracking-[0.06em] uppercase">
          {start} – {end}
        </h2>
        <Block>
          <ul aria-label={m.history_week_label({ start, end })}>
            {week.workouts.map((workout) => (
              <li
                key={workout.session.id}
                className="border-t border-rule-soft first:border-t-0"
              >
                <WorkoutRow workout={workout} longest={longest} />
              </li>
            ))}
          </ul>
        </Block>
      </section>
    );
  });
}

function WorkoutRow({
  workout,
  longest,
}: {
  workout: HistoryWorkout;
  longest: number;
}) {
  const { session, workingSets, minutes, unsynced } = workout;
  const start = new Date(session.startedAt);
  const sub = [
    m.history_row_sub({
      sets: m.history_working_sets({ count: workingSets }),
      minutes: formatNumber(minutes),
    }),
    ...(unsynced ? [m.history_not_synced()] : []),
  ].join(' · ');
  return (
    <Row asChild>
      <Link to={`/history/${session.id}`}>
        <span className="w-11 flex-none text-center leading-none">
          <b className="block text-num numeral">{start.getDate()}</b>
          <span className="mt-0.5 block label-caps">
            {formatWeekdayShort(start)}
          </span>
        </span>
        <span className="min-w-0 flex-1 leading-[1.3] font-semibold">
          {workoutName(session)}
          <small className="block text-label leading-[1.35] font-normal">
            {sub}
          </small>
          <span
            aria-hidden
            className="mt-1.5 block h-1 max-w-full rounded-[2px] bg-ink"
            style={{ width: `${Math.round((minutes / longest) * 100)}%` }}
          />
        </span>
        <RowEnd chevron />
      </Link>
    </Row>
  );
}

/** History › một buổi (prototypes/history › session, UC20 bước 2): các bài và set đã ghi. */
export function HistorySessionPage() {
  const { sessionId = '' } = useParams();
  const workout = useFinishedWorkout(sessionId);
  if (workout === undefined) return null;
  if (workout === null) {
    return (
      <AppShell
        top={
          <TopBar
            title={m.nav_history()}
            backTo="/history"
            right={<SyncPill />}
          />
        }
      >
        <Block>
          <EmptyState
            action={
              <Button asChild variant="ink">
                <Link to="/history">{m.history_back_to_list()}</Link>
              </Button>
            }
          >
            {m.history_not_found()}
          </EmptyState>
        </Block>
      </AppShell>
    );
  }
  return <SessionDetail workout={workout} />;
}

function SessionDetail({ workout }: { workout: HistoryWorkout }) {
  const comingSoon = useComingSoon();
  const { session, exercises, workingSets, minutes } = workout;
  const start = new Date(session.startedAt);
  const name = workoutName(session);
  const stats = [
    [workingSets, m.history_stat_sets()],
    [minutes, m.history_stat_minutes()],
    [exercises.length, m.history_stat_exercises()],
  ] as const;
  return (
    <AppShell
      top={
        <TopBar
          title={name}
          sub={`${formatLongDate(start)} · ${formatTime(start)}`}
          backTo="/history"
          right={
            <>
              {/* Sửa set và xoá buổi: #24. */}
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.history_options()}
                onClick={comingSoon}
              >
                <MoreIcon aria-hidden />
              </Button>
              <SyncPill />
            </>
          }
        />
      }
    >
      <section className="overflow-hidden rounded-md bg-tyvek">
        <div className="flex min-h-14 items-center bg-ink px-4 py-1.5 text-tyvek">
          <span className="line-clamp-2 min-w-0 flex-1 label-caps">
            {name} · {formatShortDate(start)}
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-3 px-4 pt-4 pb-2">
          {stats.map(([value, label]) => (
            <div key={label} className="flex flex-col">
              <dt className="order-last mt-1 label-caps">{label}</dt>
              <dd className="text-num leading-none numeral">
                {formatNumber(value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {exercises.map((item) => (
        <ExerciseBlock
          key={item.row.id}
          item={item}
          onOpenExercise={comingSoon}
        />
      ))}
    </AppShell>
  );
}

/** Dụng cụ · quy ước ghi tạ, như dòng phụ trong prototype. */
function exerciseSub(item: WorkoutExercise): string | undefined {
  const parts: string[] = [];
  if (item.exercise?.equipment) {
    parts.push(equipmentLabel(item.exercise.equipment));
  }
  if (logKind(item) === 'weight_reps')
    parts.push(loadLabel(item.row.loadInput));
  return parts.length ? parts.join(' · ') : undefined;
}

function ExerciseBlock({
  item,
  onOpenExercise,
}: {
  item: WorkoutExercise;
  /** Mở lịch sử và PR của bài (#33). */
  onOpenExercise: () => void;
}) {
  const name = exerciseName(item);
  const kind = logKind(item);
  const sub = exerciseSub(item);
  return (
    <section className="overflow-hidden rounded-md bg-tyvek">
      <h2>
        <button
          type="button"
          onClick={onOpenExercise}
          className="flex w-full items-center gap-2 py-3 pr-2 pl-4 text-left"
        >
          <span className="min-w-0 flex-1 leading-[1.3] font-bold">
            {name}
            {sub && (
              <small className="block text-label font-normal">{sub}</small>
            )}
          </span>
          <ChevronIcon className="size-5 flex-none" aria-hidden />
        </button>
      </h2>
      <ul aria-label={name}>
        {item.sets.map((set, i) => (
          <li key={set.id}>
            <Row className="first:border-t">
              <RowKey>
                <span className="uppercase">
                  {m.history_set_label({ n: i + 1 })}
                </span>
              </RowKey>
              <RowValue>{setText(kind, set.weightValue, set.reps)}</RowValue>
            </Row>
          </li>
        ))}
      </ul>
    </section>
  );
}
