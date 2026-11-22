import type { WorkoutSession } from '@fitness/contract';
import { Link, useParams } from 'react-router';

import { AppShell, TopBar } from '@/components/app-shell';
import { Block, Row, RowEnd, RowKey, RowTitle } from '@/components/block';
import { EmptyState } from '@/components/empty-state';
import { SyncPill } from '@/components/sync-pill';
import { Button } from '@/components/ui/button';
import { formatLongDate, formatNumber, formatTime } from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import { RootScreen } from '@/routes/root-screens';
import { exerciseName, logKind, setText } from '@/workout/display';
import { useFinishedWorkout, useHistory } from '@/workout/history';
import type { Workout } from '@/workout/session';

/** Tên buổi: tên ngày tập, hoặc "Tập tự do". Chưa có routine trên máy nên chưa có tên ngày. */
function workoutName(session: WorkoutSession): string {
  return session.routineDayId === null
    ? m.log_freestyle()
    : m.history_routine_workout();
}

/**
 * History › Workouts (prototypes/history, UC20 bước 1): các buổi đã kết thúc, mới nhất
 * trước, gồm cả buổi kéo về từ server. Bộ lọc, tab PR, nhóm theo tuần làm ở ticket sau.
 */
export function HistoryPage() {
  const workouts = useHistory();
  return (
    <RootScreen title={m.nav_history()}>
      {workouts?.length === 0 && (
        <Block>
          <div className="flex min-h-14 items-center rounded-t-md bg-tyvek px-4 label-caps shadow-[inset_0_0_0_2px_var(--color-ink)]">
            {m.history_empty_title()}
          </div>
          <EmptyState
            stat={0}
            action={
              <Button asChild variant="ink">
                <Link to="/">{m.history_go_today()}</Link>
              </Button>
            }
          >
            {m.history_empty_body()}
          </EmptyState>
        </Block>
      )}
      {!!workouts?.length && (
        <Block>
          <ul aria-label={m.history_workouts_label()}>
            {workouts.map(({ session, setCount }) => (
              <li
                key={session.id}
                className="border-t border-rule-soft first:border-t-0"
              >
                <Row asChild>
                  <Link to={`/history/${session.id}`}>
                    <RowTitle
                      sub={`${formatLongDate(new Date(session.startedAt))} · ${m.history_set_count({ count: setCount })}`}
                    >
                      {workoutName(session)}
                    </RowTitle>
                    <RowEnd chevron />
                  </Link>
                </Row>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </RootScreen>
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

function SessionDetail({ workout }: { workout: Workout }) {
  const { session, exercises, setCount } = workout;
  const start = new Date(session.startedAt);
  const minutes = Math.round(
    (Date.parse(session.endedAt ?? session.startedAt) - start.getTime()) /
      60_000,
  );
  const stats = [
    [setCount, m.history_stat_sets()],
    [minutes, m.history_stat_minutes()],
    [exercises.length, m.history_stat_exercises()],
  ] as const;
  return (
    <AppShell
      top={
        <TopBar
          title={workoutName(session)}
          sub={`${formatLongDate(start)} · ${formatTime(start)}`}
          backTo="/history"
          right={<SyncPill />}
        />
      }
    >
      <Block>
        <dl className="grid grid-cols-3 px-4 py-3">
          {stats.map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="label-caps">{label}</dt>
              <dd className="text-num leading-none numeral">
                {formatNumber(value)}
              </dd>
            </div>
          ))}
        </dl>
      </Block>
      {exercises.map((item) => {
        const name = exerciseName(item);
        const kind = logKind(item);
        return (
          <Block key={item.row.id} className="mt-3">
            <h2 className="px-4 pt-3 pb-2 leading-[1.2] font-bold">{name}</h2>
            <ul aria-label={name} className="border-t border-rule-soft">
              {item.sets.map((set, i) => (
                <li
                  key={set.id}
                  className="border-t border-rule-soft first:border-t-0"
                >
                  <Row>
                    <RowKey>{m.history_set_label({ n: i + 1 })}</RowKey>
                    <span className="text-num leading-none numeral">
                      {setText(kind, set.weightValue, set.reps)}
                    </span>
                  </Row>
                </li>
              ))}
            </ul>
          </Block>
        );
      })}
    </AppShell>
  );
}
