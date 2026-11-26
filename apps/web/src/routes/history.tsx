import type { WorkoutSession } from '@fitness/contract';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { equipmentLabel } from '@/catalog/display';
import { AppShell, Foot, TopBar } from '@/components/app-shell';
import { Bib, BibBand } from '@/components/bib';
import { Block, Row, RowEnd, RowKey, RowValue } from '@/components/block';
import { Chip, ChipRow } from '@/components/chip';
import { Subtabs } from '@/components/controls';
import { EmptyState } from '@/components/empty-state';
import { NumberInput } from '@/components/field';
import {
  ChevronIcon,
  EditIcon,
  MoreIcon,
  PlayIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/icons';
import { Menu, MenuItem } from '@/components/menu';
import { SyncPill } from '@/components/sync-pill';
import { Note } from '@/components/text';
import { useToast } from '@/components/toast-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useComingSoon } from '@/hooks/use-coming-soon';
import { useSyncStatus } from '@/hooks/use-sync-status';
import {
  formatLongDate,
  formatNumber,
  formatShortDate,
  formatTime,
  formatWeekdayShort,
} from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import { RootScreen } from '@/routes/root-screens';
import {
  draftFrom,
  exerciseName,
  loadLabel,
  logKind,
  type SetDraft,
  setText,
  setValuesOf,
} from '@/workout/display';
import {
  groupByWeek,
  type HistoryWorkout,
  useFinishedWorkout,
  useHistory,
} from '@/workout/history';
import {
  deleteSession,
  restoreSession,
  saveSetEdits,
  type WorkoutExercise,
} from '@/workout/session';

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

/** Bản đang sửa của buổi (UC11): số đang gõ theo id set, các set đánh dấu xoá. */
interface EditState {
  drafts: Record<string, SetDraft>;
  removed: Set<string>;
}

function SessionDetail({ workout }: { workout: HistoryWorkout }) {
  const comingSoon = useComingSoon();
  const navigate = useNavigate();
  const toast = useToast();
  const { online } = useSyncStatus();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [edit, setEdit] = React.useState<EditState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const { session, exercises, workingSets, minutes } = workout;
  const start = new Date(session.startedAt);
  const name = workoutName(session);
  const date = formatShortDate(start);
  const stats = [
    [workingSets, m.history_stat_sets()],
    [minutes, m.history_stat_minutes()],
    [exercises.length, m.history_stat_exercises()],
  ] as const;

  // Số sẽ lưu của từng set còn giữ; một ô chưa hợp lệ thì khoá nút lưu.
  const edits = edit
    ? exercises.flatMap((item) =>
        item.sets
          .filter((set) => !edit.removed.has(set.id))
          .map((set) => ({
            setId: set.id,
            values: setValuesOf(logKind(item), edit.drafts[set.id]),
          })),
      )
    : [];
  const valid = edits.every((e) => e.values !== null);

  function startEdit() {
    setMenuOpen(false);
    setEdit({
      drafts: Object.fromEntries(
        exercises.flatMap((item) =>
          item.sets.map((set) => [set.id, draftFrom(set)]),
        ),
      ),
      removed: new Set(),
    });
  }

  async function save() {
    if (!edit || !valid) return;
    setSaving(true);
    try {
      await saveSetEdits(
        edits.flatMap(({ setId, values }) =>
          values ? [{ setId, values }] : [],
        ),
        [...edit.removed],
      );
    } finally {
      setSaving(false);
    }
    setEdit(null);
    toast.show(online ? m.history_saved() : m.history_saved_offline());
  }

  async function remove() {
    setConfirmDelete(false);
    // Rời màn trước khi buổi thành tombstone, để màn không kịp báo "không có buổi này".
    await navigate('/history', { replace: true });
    await deleteSession(session.id);
    toast.show(m.history_deleted({ name }), {
      durationMs: 5000,
      action: {
        label: m.common_undo(),
        onClick: () => {
          toast.hide();
          void restoreSession(session.id);
        },
      },
    });
  }

  return (
    <AppShell
      top={
        <TopBar
          title={name}
          sub={`${formatLongDate(start)} · ${formatTime(start)}`}
          backTo="/history"
          right={
            <>
              {!edit && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={m.history_options()}
                  onClick={() => setMenuOpen(true)}
                >
                  <MoreIcon aria-hidden />
                </Button>
              )}
              <SyncPill />
            </>
          }
        />
      }
      foot={
        edit && (
          <Foot
            dock={
              <>
                <Button
                  variant="line"
                  size="go"
                  className="flex-[0_0_33%]"
                  onClick={() => setEdit(null)}
                >
                  {m.common_cancel()}
                </Button>
                <Button
                  variant="ink"
                  size="go"
                  className="shrink"
                  disabled={!valid}
                  busy={saving}
                  onClick={save}
                >
                  {m.history_save_changes()}
                </Button>
              </>
            }
          />
        )
      }
    >
      <Bib>
        {edit ? (
          <BibBand edit>{m.history_editing_band({ name, date })}</BibBand>
        ) : (
          <div className="flex min-h-14 items-center bg-ink px-4 py-1.5 text-tyvek">
            <span className="line-clamp-2 min-w-0 flex-1 label-caps">
              {name} · {date}
            </span>
          </div>
        )}
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
      </Bib>
      {exercises.map((item) => (
        <ExerciseBlock
          key={item.row.id}
          item={item}
          onOpenExercise={comingSoon}
          edit={
            edit && {
              drafts: edit.drafts,
              removed: edit.removed,
              onDraftChange: (setId, draft) =>
                setEdit({
                  ...edit,
                  drafts: { ...edit.drafts, [setId]: draft },
                }),
              onRemove: (setId) =>
                setEdit({ ...edit, removed: new Set(edit.removed).add(setId) }),
            }
          }
        />
      ))}
      {edit && <Note>{m.history_edit_note()}</Note>}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{m.history_menu_title()}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <Menu>
              <MenuItem
                icon={<EditIcon aria-hidden />}
                sub={m.history_edit_sets_hint()}
                onClick={startEdit}
              >
                {m.history_edit_sets()}
              </MenuItem>
              <MenuItem
                danger
                icon={<TrashIcon aria-hidden />}
                sub={m.history_delete_hint()}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                {m.history_delete()}
              </MenuItem>
            </Menu>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{m.history_delete_title()}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <p>{m.history_delete_body({ name, date })}</p>
          </SheetBody>
          <SheetFooter className="flex-row flex-wrap">
            <Button variant="danger" onClick={remove}>
              {m.history_delete()}
            </Button>
            <Button variant="line" onClick={() => setConfirmDelete(false)}>
              {m.history_delete_keep()}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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

/** Chế độ sửa của một bài: số đang gõ và set đã đánh dấu xoá. */
interface ExerciseEdit extends EditState {
  onDraftChange: (setId: string, draft: SetDraft) => void;
  onRemove: (setId: string) => void;
}

function ExerciseBlock({
  item,
  onOpenExercise,
  edit,
}: {
  item: WorkoutExercise;
  /** Mở lịch sử và PR của bài (#33). */
  onOpenExercise: () => void;
  /** Có khi đang sửa buổi (UC11). */
  edit?: ExerciseEdit | null;
}) {
  const name = exerciseName(item);
  const kind = logKind(item);
  const sub = exerciseSub(item);
  const title = (
    <span className="min-w-0 flex-1 leading-[1.3] font-bold">
      {name}
      {sub && <small className="block text-label font-normal">{sub}</small>}
    </span>
  );
  return (
    <Bib>
      <h2>
        {edit ? (
          <span className="flex w-full items-center gap-2 py-3 pr-2 pl-4">
            {title}
          </span>
        ) : (
          <button
            type="button"
            onClick={onOpenExercise}
            className="flex w-full items-center gap-2 py-3 pr-2 pl-4 text-left"
          >
            {title}
            <ChevronIcon className="size-5 flex-none" aria-hidden />
          </button>
        )}
      </h2>
      <ul aria-label={name}>
        {item.sets
          .filter((set) => !edit?.removed.has(set.id))
          .map((set, i) => {
            const n = i + 1;
            const key = (
              <RowKey>
                <span className="uppercase">{m.history_set_label({ n })}</span>
              </RowKey>
            );
            // Bài ghi bằng thời gian, quãng đường (#13) chưa sửa được: giữ hàng chỉ đọc.
            if (!edit || kind === 'unsupported') {
              return (
                <li key={set.id}>
                  <Row className="first:border-t">
                    {key}
                    <RowValue>
                      {setText(kind, set.weightValue, set.reps)}
                    </RowValue>
                  </Row>
                </li>
              );
            }
            const draft = edit.drafts[set.id];
            // Ô nào làm set không hợp lệ: thử luật chung với ô kia đã hợp lệ.
            const badReps =
              setValuesOf(kind, { weight: 0, reps: draft.reps }) === null;
            const badWeight =
              setValuesOf(kind, { weight: draft.weight, reps: 1 }) === null;
            const repsInput = (
              <NumberInput
                aria-label={m.history_set_reps({ name, n })}
                aria-invalid={badReps}
                maxFractionDigits={0}
                value={draft.reps}
                onValueChange={(reps) =>
                  edit.onDraftChange(set.id, { ...draft, reps })
                }
                className="h-11"
              />
            );
            return (
              <li key={set.id}>
                <Row className="first:border-t">
                  {key}
                  <span className="flex items-center gap-1.5">
                    {kind === 'reps' ? (
                      <>
                        {repsInput}
                        <span className="label-caps">{m.log_unit_reps()}</span>
                      </>
                    ) : (
                      <>
                        <NumberInput
                          aria-label={m.history_set_weight({ name, n })}
                          aria-invalid={badWeight}
                          value={draft.weight}
                          onValueChange={(weight) =>
                            edit.onDraftChange(set.id, { ...draft, weight })
                          }
                          className="h-11"
                        />
                        <span
                          aria-hidden
                          className="font-numeral text-num font-extrabold"
                        >
                          ×
                        </span>
                        {repsInput}
                      </>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    aria-label={m.history_delete_set({ n })}
                    onClick={() => edit.onRemove(set.id)}
                  >
                    <TrashIcon aria-hidden />
                  </Button>
                </Row>
              </li>
            );
          })}
      </ul>
    </Bib>
  );
}
