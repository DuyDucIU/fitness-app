import type {
  AddRoutineExerciseRequest,
  CatalogExercise,
  Routine,
  RoutineDay,
  RoutineExercise,
} from '@fitness/contract';
import { equipmentDefaults } from '@fitness/engine';
import * as React from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

import { exerciseNames } from '@/catalog/display';
import { equipmentLabel } from '@/catalog/display';
import { ExercisePicker } from '@/catalog/exercise-search';
import { useCatalog } from '@/catalog/use-catalog';
import { AppShell, Foot, SectionHeading, TopBar } from '@/components/app-shell';
import { Banner } from '@/components/banner';
import { Bib, BibBand, BibPerf, BibStub } from '@/components/bib';
import { Block, Row, RowEnd, RowTitle } from '@/components/block';
import { Segmented, SwitchRow } from '@/components/controls';
import { EmptyState } from '@/components/empty-state';
import { Field, TextInput } from '@/components/field';
import {
  AlertIcon,
  ChevronIcon,
  EditIcon,
  GripIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/icons';
import { useSortable } from '@/components/sortable';
import { SyncPill } from '@/components/sync-pill';
import { Note } from '@/components/text';
import { useToast } from '@/components/toast-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getLocale } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';
import { RootScreen } from '@/routes/root-screens';
import {
  defaultDayName,
  defaultTarget,
  type ExerciseTarget,
  swapChanges,
  targetOf,
  targetParts,
  workingSets,
} from '@/routines/display';
import {
  type DraftDay,
  getDraftDay,
  setDraftDay,
  updateDraftDay,
  useDraftDay,
} from '@/routines/draft-day';
import { ExerciseSheet } from '@/routines/exercise-sheet';
import { useActiveRoutine } from '@/routines/rotation';
import {
  useRoutine,
  useRoutines,
  useRoutineWrite,
} from '@/routines/use-routines';
import { loadLabel } from '@/workout/display';
import { findLastTime } from '@/workout/last-time';
import { useOpenSession } from '@/workout/session';
import { useStartWorkout } from '@/workout/use-start-workout';
import { WorkoutResumeBar } from '@/workout/workout-resume-bar';
import { useLiveQuery } from 'dexie-react-hooks';

const routinePath = (id: string) => `/plans/${id}`;
const dayPath = (routineId: string, dayId: string) =>
  `/plans/${routineId}/days/${dayId}`;

/** Tên bài theo ngôn ngữ UI; bài không còn trong catalog trên máy thì để trống. */
function useExerciseLookup() {
  const catalog = useCatalog();
  return React.useMemo(() => {
    const byId = new Map((catalog ?? []).map((e) => [e.id, e]));
    const locale = getLocale();
    return {
      get: (id: string) => byId.get(id),
      name: (id: string) => {
        const exercise = byId.get(id);
        return exercise ? exerciseNames(exercise, locale).name : '…';
      },
    };
  }, [catalog]);
}

/** Số thứ tự 28px đầu hàng ngày tập / bài (.dayrow .n). */
function OrderNo({ n }: { n: number }) {
  return (
    <b className="w-6 flex-none text-center text-num leading-none numeral">
      {n}
    </b>
  );
}

/** Dòng gợi ý dưới danh sách kéo thả, kèm biểu tượng tay nắm (.reorder-hint). */
function ReorderHint({ id, children }: { id: string; children: string }) {
  return (
    <Note id={id} className="mt-2! flex items-center gap-1.5">
      <GripIcon className="size-4 flex-none" aria-hidden />
      {children}
    </Note>
  );
}

const libraryRow = (count: number | undefined) => (
  <>
    <SectionHeading>{m.plans_exercises_heading()}</SectionHeading>
    <Block>
      <Row asChild>
        <Link to="/plans/exercises">
          <SearchIcon className="size-5 flex-none" aria-hidden />
          <RowTitle sub={count ? m.plans_library_count({ count }) : undefined}>
            {m.plans_library_title()}
          </RowTitle>
          <RowEnd chevron />
        </Link>
      </Row>
    </Block>
  </>
);

/**
 * Tab Plans (prototypes/plans › Plans root): routine đang dùng nổi bật trên tấm số áo kèm
 * các ngày tập (mỗi ngày bắt đầu được ngay khi không có buổi dở, UC06) và cuống "Next up"
 * theo buổi gần nhất, các routine khác, nút tạo routine, rồi thư viện bài tập. "Browse
 * programs" thuộc #16.
 */
export function PlansPage() {
  const routines = useRoutines();
  const rotation = useActiveRoutine()?.active;
  const { start, starting } = useStartWorkout();
  // Đang có buổi dở thì không bắt đầu ngày khác; tiếp tục bằng thanh Resume.
  const workoutOpen = useOpenSession() !== null;
  const exercises = useExerciseLookup();
  // Đếm như danh sách trong thư viện: không tính bài đã lưu trữ.
  const count = useCatalog()?.filter((e) => !e.isArchived).length;

  if (routines === undefined) return <RootScreen title={m.nav_plans()} />;

  if (routines.length === 0) {
    return (
      <RootScreen title={m.nav_plans()}>
        <Bib>
          <BibBand open>{m.plans_no_routine()}</BibBand>
          <EmptyState
            stat={0}
            action={
              <Button asChild>
                <Link to="/plans/new">
                  <EditIcon aria-hidden />
                  {m.plans_write_routine()}
                </Link>
              </Button>
            }
          >
            {m.plans_no_routine_body()}
          </EmptyState>
        </Bib>
        {libraryRow(count)}
      </RootScreen>
    );
  }

  const active = routines.find((r) => r.isActive);
  const others = routines.filter((r) => !r.isActive);
  return (
    <RootScreen title={m.nav_plans()}>
      {active && (
        <Bib aria-label={m.plans_active_routine()}>
          <BibBand
            open
            action={
              <Button asChild variant="ghost" size="icon" className="w-10">
                <Link
                  to={routinePath(active.id)}
                  aria-label={m.plans_edit_routine({ name: active.name })}
                >
                  <EditIcon aria-hidden />
                </Link>
              </Button>
            }
          >
            {m.plans_active_band({ name: active.name })}
          </BibBand>
          <div>
            {active.days.map((day, i) => {
              const names = day.exercises.map((e) =>
                exercises.name(e.exerciseId),
              );
              const more = names.length - 3;
              const sub = [
                names.slice(0, 3).join(', '),
                more > 0 ? m.plans_more_exercises({ count: more }) : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <Row key={day.id}>
                  <OrderNo n={i + 1} />
                  <Link
                    to={dayPath(active.id, day.id)}
                    className="min-w-0 flex-1 no-underline"
                  >
                    <RowTitle sub={sub || undefined}>{day.name}</RowTitle>
                  </Link>
                  <Button
                    variant="line"
                    className="min-h-10 flex-none px-3"
                    aria-label={m.home_start_day({ name: day.name })}
                    disabled={starting || workoutOpen}
                    onClick={() => start(day.id)}
                  >
                    <PlayIcon aria-hidden />
                    {m.plans_start_day()}
                  </Button>
                </Row>
              );
            })}
          </div>
          {rotation?.routine.id === active.id && rotation.next >= 0 && (
            <NextUp
              next={active.days[rotation.next].name}
              last={
                rotation.last === null ? null : active.days[rotation.last].name
              }
            />
          )}
        </Bib>
      )}
      {others.length > 0 && (
        <>
          <SectionHeading>
            {active ? m.plans_other_routines() : m.plans_routines()}
          </SectionHeading>
          <Block>
            {others.map((r) => (
              <Row key={r.id} asChild>
                <Link to={routinePath(r.id)}>
                  <RowTitle sub={m.plans_routine_days({ count: r.days.length })}>
                    {r.name}
                  </RowTitle>
                  <RowEnd chevron />
                </Link>
              </Row>
            ))}
          </Block>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/plans/new">
            <PlusIcon aria-hidden />
            {m.plans_new_routine()}
          </Link>
        </Button>
      </div>
      {libraryRow(count)}
    </RootScreen>
  );
}

/**
 * Cuống "Next up" của routine đang dùng (prototypes/plans › .stub): ngày kế tiếp theo buổi
 * gần nhất, và nhắc rằng ngày nào cũng bắt đầu được.
 */
function NextUp({ next, last }: { next: string; last: string | null }) {
  return (
    <>
      <BibPerf />
      <BibStub
        label={m.plans_next_up()}
        value={<span className="uppercase">{next}</span>}
      >
        {last && `${m.plans_next_after({ next, last })} `}
        {m.plans_next_hint()}
      </BibStub>
    </>
  );
}

/** Thanh trên của các màn đi sâu trong Plans: có chip đồng bộ như mọi màn. */
function PlansTop({
  title,
  sub,
  backTo,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  backTo: string;
}) {
  return (
    <TopBar title={title} sub={sub} backTo={backTo} right={<SyncPill />} />
  );
}

/** Plans › New routine (prototypes/plans › newView). */
export function NewRoutinePage() {
  const navigate = useNavigate();
  const write = useRoutineWrite();
  const toast = useToast();
  const [name, setName] = React.useState('');
  const [days, setDays] = React.useState('3');
  const [active, setActive] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  async function create() {
    setBusy(true);
    const routineName = name.trim() || m.routine_new_default_name();
    const routine = await write((api) =>
      api.create({
        name: routineName,
        isActive: active,
        days: Array.from({ length: Number(days) }, (_, i) => ({
          name: defaultDayName(i + 1),
        })),
      }),
    );
    setBusy(false);
    if (!routine) return;
    toast.show(m.routine_new_created({ name: routine.name }));
    await navigate(dayPath(routine.id, routine.days[0].id), { replace: true });
  }

  return (
    <AppShell
      banner={<WorkoutResumeBar />}
      top={<PlansTop title={m.routine_new_title()} backTo="/plans" />}
      foot={
        <Foot
          dock={
            <Button variant="orange" size="go" busy={busy} onClick={create}>
              {m.routine_new_create()}
            </Button>
          }
        />
      }
    >
      <Block pad>
        <Field label={m.routine_name()}>
          <TextInput
            autoFocus
            placeholder={m.routine_new_name_placeholder()}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={m.routine_new_days()} help={m.routine_new_days_hint()}>
          <Segmented
            aria-label={m.routine_new_days()}
            value={days}
            onValueChange={setDays}
            options={['1', '2', '3', '4', '5', '6'].map((n) => ({
              value: n,
              label: n,
            }))}
          />
        </Field>
        <div className="border-t border-rule-soft pt-3">
          <SwitchRow
            label={m.routine_new_active()}
            sub={m.routine_new_active_hint()}
            checked={active}
            onCheckedChange={setActive}
          />
        </div>
      </Block>
      <Note>{m.routine_new_note()}</Note>
    </AppShell>
  );
}

/**
 * Ô tên lưu khi rời ô (cần mạng). Tên rỗng hoặc lưu không được thì quay về tên đang có.
 */
function NameField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (name: string) => Promise<unknown>;
}) {
  const [text, setText] = React.useState<string | null>(null);
  return (
    <Field label={label}>
      <TextInput
        value={text ?? value}
        onFocus={() => setText(value)}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => {
          const next = text?.trim();
          if (next && next !== value) await onSave(next);
          setText(null);
        }}
      />
    </Field>
  );
}

/** Plans › routine (prototypes/plans › planView): tên, routine đang dùng, ngày tập, xoá. */
export function RoutinePage() {
  const { routineId } = useParams();
  const routine = useRoutine(routineId);
  if (routine === undefined) return <AppShell />;
  if (routine === null) return <Navigate to="/plans" replace />;
  return <RoutineEditor routine={routine} />;
}

function RoutineEditor({ routine }: { routine: Routine }) {
  const navigate = useNavigate();
  const write = useRoutineWrite();
  const toast = useToast();
  const open = useOpenSession();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const hintId = React.useId();
  const sortable = useSortable({
    items: routine.days,
    name: (day) => day.name,
    onCommit: (ids) => write((api) => api.reorderDays(routine.id, ids)),
  });

  async function remove() {
    const ok = await write(async (api) => {
      await api.archive(routine.id);
      return true;
    });
    setConfirmDelete(false);
    if (!ok) return;
    toast.show(m.routine_deleted({ name: routine.name }));
    await navigate('/plans', { replace: true });
  }

  function addDay() {
    setDraftDay({
      routineId: routine.id,
      name: defaultDayName(routine.days.length + 1),
      exercises: [],
      touched: false,
    });
    void navigate(dayPath(routine.id, 'new'));
  }

  return (
    <AppShell
      banner={<WorkoutResumeBar />}
      top={
        <PlansTop
          title={routine.name}
          sub={routine.isActive ? m.routine_active() : m.routine_sub()}
          backTo="/plans"
        />
      }
    >
      <Block pad>
        <NameField
          label={m.routine_name()}
          value={routine.name}
          onSave={(name) => write((api) => api.update(routine.id, { name }))}
        />
        <div className="border-t border-rule-soft pt-3">
          <SwitchRow
            label={m.routine_active()}
            sub={m.routine_active_hint()}
            checked={routine.isActive}
            onCheckedChange={async (checked) => {
              // Như prototype: không tắt được routine đang dùng, chỉ chọn routine khác.
              if (!checked) return;
              const done = await write((api) =>
                api.update(routine.id, { isActive: true }),
              );
              if (done) toast.show(m.routine_now_active({ name: routine.name }));
            }}
          />
        </div>
      </Block>
      {open && routine.isActive && (
        <Banner
          className="mx-0 mt-3 mb-0"
          icon={<AlertIcon aria-hidden />}
          title={m.routine_session_title()}
        >
          {m.routine_session_body()}
        </Banner>
      )}
      <SectionHeading>{m.routine_days_heading()}</SectionHeading>
      <Block>
        <ol {...sortable.listProps}>
          {sortable.ordered.map((day, i) => (
            <li key={day.id} {...sortable.itemProps(day)}>
              <Row className="border-t-0">
                {sortable.handle(day, i, hintId)}
                <OrderNo n={i + 1} />
                <Link
                  to={dayPath(routine.id, day.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 no-underline"
                >
                  <RowTitle
                    sub={`${m.routine_exercise_count({ count: day.exercises.length })} · ${m.routine_working_set_count({ count: workingSets(day.exercises) })}`}
                  >
                    {day.name}
                  </RowTitle>
                  <ChevronIcon className="-mr-1 size-5 flex-none" aria-hidden />
                </Link>
              </Row>
            </li>
          ))}
        </ol>
        <Row asChild tone="add">
          <button type="button" onClick={addDay}>
            <PlusIcon className="size-5" aria-hidden />
            {m.routine_add_day()}
          </button>
        </Row>
      </Block>
      <ReorderHint id={hintId}>{m.routine_reorder_days_hint()}</ReorderHint>
      <Block className="mt-6!">
        <Row asChild tone="danger">
          <button type="button" onClick={() => setConfirmDelete(true)}>
            <TrashIcon className="size-5 flex-none" aria-hidden />
            <RowTitle sub={m.routine_delete_hint()}>
              {m.routine_delete()}
            </RowTitle>
          </button>
        </Row>
      </Block>
      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{m.routine_delete_title()}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <p className="mb-4">{m.routine_delete_body()}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={remove}>
                {m.routine_delete()}
              </Button>
              <Button variant="line" onClick={() => setConfirmDelete(false)}>
                {m.routine_delete_keep()}
              </Button>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

/** Thao tác trên một ngày tập: ghi thẳng lên server, hoặc vào ngày mới đang soạn. */
interface DayActions {
  rename(name: string): Promise<unknown>;
  add(target: AddRoutineExerciseRequest): Promise<boolean>;
  update(row: RoutineExercise, changes: Partial<ExerciseTarget>): Promise<boolean>;
  remove(row: RoutineExercise): Promise<boolean>;
  reorder(ids: string[]): Promise<unknown>;
}

const newId = () => crypto.randomUUID();

const rowFrom = (
  target: AddRoutineExerciseRequest,
  position: number,
): RoutineExercise => ({
  ...target,
  id: target.id ?? newId(),
  position,
  supersetGroup: null,
});

/** Request tạo lại đúng bài này (giữ id và thứ tự), vd khi hoàn tác xoá. */
const requestOf = (row: RoutineExercise): AddRoutineExerciseRequest => ({
  ...targetOf(row),
  id: row.id,
  position: row.position,
});

/** Plans › ngày tập (prototypes/plans › dayView), gồm ngày mới chưa lưu (`days/new`). */
export function DayPage() {
  const { routineId, dayId } = useParams();
  const routine = useRoutine(routineId);
  const draft = useDraftDay();
  const needsDraft =
    dayId === 'new' && !!routine && draft?.routineId !== routine.id;
  const nextDayNo = (routine?.days.length ?? 0) + 1;
  React.useEffect(() => {
    // Mở thẳng `days/new` (vd tải lại trang): bắt đầu một ngày mới.
    if (needsDraft && routine) {
      setDraftDay({
        routineId: routine.id,
        name: defaultDayName(nextDayNo),
        exercises: [],
        touched: false,
      });
    }
  }, [needsDraft, routine, nextDayNo]);
  if (routine === undefined) return <AppShell />;
  if (routine === null) return <Navigate to="/plans" replace />;
  if (dayId === 'new') {
    if (!draft || needsDraft) return <AppShell />;
    return <DraftDayEditor routine={routine} draft={draft} />;
  }
  const day = routine.days.find((d) => d.id === dayId);
  if (!day) return <Navigate to={routinePath(routine.id)} replace />;
  return <SavedDayEditor routine={routine} day={day} />;
}

function SavedDayEditor({ routine, day }: { routine: Routine; day: RoutineDay }) {
  const write = useRoutineWrite();
  const navigate = useNavigate();
  const toast = useToast();
  const ok = (r: unknown) => r !== undefined;
  const actions: DayActions = {
    rename: (name) => write((api) => api.updateDay(day.id, { name })),
    add: async (target) =>
      ok(await write((api) => api.addExercise(day.id, target))),
    update: async (row, changes) =>
      ok(await write((api) => api.updateExercise(row.id, changes))),
    remove: async (row) =>
      ok(await write((api) => api.deleteExercise(row.id))),
    reorder: (ids) => write((api) => api.reorderExercises(day.id, ids)),
  };

  async function removeDay() {
    const index = routine.days.findIndex((d) => d.id === day.id);
    const done = await write((api) => api.deleteDay(day.id));
    if (!done) return;
    await navigate(routinePath(routine.id), { replace: true });
    toast.show(m.day_removed({ name: day.name }), {
      durationMs: 5000,
      action: {
        label: m.common_undo(),
        onClick: async () => {
          const back = await write((api) =>
            api.addDay(routine.id, {
              id: day.id,
              name: day.name,
              position: index,
              exercises: day.exercises.map(requestOf),
            }),
          );
          if (back) toast.show(m.day_restored({ name: day.name }));
        },
      },
    });
  }

  return (
    <DayEditor
      routine={routine}
      name={day.name}
      exercises={day.exercises}
      actions={actions}
      sub={routine.name}
      extra={
        <Block className="mt-6!">
          {routine.days.length > 1 ? (
            <Row asChild tone="danger">
              <button type="button" onClick={removeDay}>
                <TrashIcon className="size-5 flex-none" aria-hidden />
                <RowTitle
                  sub={m.day_remove_hint({ count: day.exercises.length })}
                >
                  {m.day_remove()}
                </RowTitle>
              </button>
            </Row>
          ) : (
            <Row aria-disabled="true">
              <TrashIcon className="size-5 flex-none" aria-hidden />
              <RowTitle sub={m.day_remove_last_hint()}>
                {m.day_remove()}
              </RowTitle>
            </Row>
          )}
        </Block>
      }
      dock={
        <Button asChild variant="ink" size="go">
          <Link to={routinePath(routine.id)}>{m.day_done()}</Link>
        </Button>
      }
    />
  );
}

function DraftDayEditor({
  routine,
  draft,
}: {
  routine: Routine;
  draft: DraftDay;
}) {
  const write = useRoutineWrite();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const saved = React.useRef(false);

  // Rời màn mà chưa chạm Done: ngày chưa được thêm; báo và cho quay lại sửa tiếp.
  React.useEffect(
    () => () => {
      const left = getDraftDay();
      if (saved.current || !left || !(left.touched || left.exercises.length)) {
        return;
      }
      toast.show(m.day_draft_lost({ name: left.name }), {
        durationMs: 5000,
        action: {
          label: m.day_keep_editing(),
          onClick: () => void navigate(dayPath(left.routineId, 'new')),
        },
      });
    },
    [navigate, toast],
  );

  const actions: DayActions = {
    rename: async (name) => updateDraftDay((d) => ({ ...d, name })),
    add: async (target) => {
      updateDraftDay((d) => ({
        ...d,
        exercises: [...d.exercises, rowFrom(target, d.exercises.length)],
      }));
      return true;
    },
    update: async (row, changes) => {
      updateDraftDay((d) => ({
        ...d,
        exercises: d.exercises.map((e) =>
          e.id === row.id ? { ...e, ...changes } : e,
        ),
      }));
      return true;
    },
    remove: async (row) => {
      updateDraftDay((d) => ({
        ...d,
        exercises: d.exercises.filter((e) => e.id !== row.id),
      }));
      return true;
    },
    reorder: async (ids) =>
      updateDraftDay((d) => ({
        ...d,
        exercises: ids.map((id) => d.exercises.find((e) => e.id === id)!),
      })),
  };

  async function done() {
    setBusy(true);
    const name = draft.name.trim() || defaultDayName(routine.days.length + 1);
    const result = await write((api) =>
      api.addDay(routine.id, {
        name,
        exercises: draft.exercises.map(requestOf),
      }),
    );
    setBusy(false);
    if (!result) return;
    saved.current = true;
    await navigate(routinePath(routine.id), { replace: true });
    setDraftDay(null);
    toast.show(
      draft.exercises.length
        ? m.day_added_with({ name, count: draft.exercises.length })
        : m.day_added({ name }),
    );
  }

  return (
    <DayEditor
      routine={routine}
      name={draft.name}
      exercises={draft.exercises}
      actions={actions}
      sub={m.day_new_sub()}
      liveName
      extra={
        <Note className="mt-2!">
          {m.day_draft_note({ routine: routine.name })}
        </Note>
      }
      dock={
        <Button variant="ink" size="go" busy={busy} onClick={done}>
          {m.day_done()}
        </Button>
      }
    />
  );
}

/** Màn sửa một ngày tập: tên, danh sách bài kéo thả, sheet bài, picker. */
function DayEditor({
  routine,
  name,
  exercises,
  actions,
  sub,
  liveName,
  extra,
  dock,
}: {
  routine: Routine;
  name: string;
  exercises: RoutineExercise[];
  actions: DayActions;
  sub: string;
  /** Tên đổi ngay khi gõ (ngày mới chưa lưu), thay vì lưu khi rời ô. */
  liveName?: boolean;
  extra: React.ReactNode;
  dock: React.ReactNode;
}) {
  const toast = useToast();
  const lookup = useExerciseLookup();
  const hintId = React.useId();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [picker, setPicker] = React.useState<
    { mode: 'add' } | { mode: 'swap'; row: RoutineExercise } | null
  >(null);
  const sortable = useSortable({
    items: exercises,
    name: (row) => lookup.name(row.exerciseId),
    onCommit: actions.reorder,
  });
  const editingRow = exercises.find((e) => e.id === editing) ?? null;

  async function pick(exercise: CatalogExercise) {
    const label = exerciseNames(exercise, getLocale()).name;
    if (picker?.mode === 'swap') {
      const ok = await actions.update(
        picker.row,
        swapChanges(targetOf(picker.row), exercise),
      );
      if (ok) toast.show(m.day_exercise_changed({ name: label }));
    } else {
      const ok = await actions.add(
        defaultTarget(exercise.id, exercise.metricType),
      );
      if (ok) toast.show(m.day_exercise_added({ name: label }));
    }
    setPicker(null);
  }

  async function remove(row: RoutineExercise) {
    setEditing(null);
    const index = exercises.findIndex((e) => e.id === row.id);
    if (!(await actions.remove(row))) return;
    toast.show(
      m.day_exercise_removed({ name: lookup.name(row.exerciseId) }),
      {
        durationMs: 4000,
        action: {
          label: m.common_undo(),
          onClick: () =>
            void actions.add({ ...requestOf(row), position: index }),
        },
      },
    );
  }

  return (
    <AppShell
      banner={<WorkoutResumeBar />}
      top={
        <PlansTop
          title={name}
          sub={sub}
          backTo={routinePath(routine.id)}
        />
      }
      foot={<Foot dock={dock} />}
    >
      <Block pad>
        {liveName ? (
          <Field label={m.day_name_label()}>
            <TextInput
              value={name}
              onChange={(e) => void actions.rename(e.target.value)}
            />
          </Field>
        ) : (
          <NameField
            label={m.day_name_label()}
            value={name}
            onSave={actions.rename}
          />
        )}
      </Block>
      <SectionHeading>{m.day_exercises_heading()}</SectionHeading>
      <Block>
        {exercises.length > 0 ? (
          <ol {...sortable.listProps}>
            {sortable.ordered.map((row, i) => (
              <li key={row.id} {...sortable.itemProps(row)}>
                <ExerciseRow
                  row={row}
                  index={i}
                  exercise={lookup.get(row.exerciseId)}
                  name={lookup.name(row.exerciseId)}
                  handle={sortable.handle(row, i, hintId)}
                  onEdit={() => setEditing(row.id)}
                />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState>{m.day_empty()}</EmptyState>
        )}
        <Row asChild tone="add">
          <button type="button" onClick={() => setPicker({ mode: 'add' })}>
            <PlusIcon className="size-5" aria-hidden />
            {m.day_add_exercise()}
          </button>
        </Row>
      </Block>
      <ReorderHint id={hintId}>{m.day_reorder_hint()}</ReorderHint>
      <Note className="mt-2!">{m.day_start_weight_note()}</Note>
      {extra}
      <ExerciseSheet
        row={editingRow}
        exercise={editingRow ? lookup.get(editingRow.exerciseId) : undefined}
        name={editingRow ? lookup.name(editingRow.exerciseId) : ''}
        dayName={name}
        onClose={() => setEditing(null)}
        onSave={(row, changes) => void actions.update(row, changes)}
        onChangeExercise={(row) => {
          setEditing(null);
          setPicker({ mode: 'swap', row });
        }}
        onRemove={remove}
      />
      <ExercisePicker
        open={!!picker}
        onOpenChange={(open) => !open && setPicker(null)}
        title={
          picker?.mode === 'swap' ? m.ex_change() : m.plans_picker_add_title()
        }
        onPick={pick}
      />
    </AppShell>
  );
}

/** Chữ đầu viết hoa như nhãn của prototype ("Per dumbbell"). */
const capitalize = (text: string) =>
  text.charAt(0).toLocaleUpperCase(getLocale()) + text.slice(1);

/** Bài không ghi tạ: nêu cách ghi số liệu (prototype › DATA.METRIC). */
function metricLabel(metric: CatalogExercise['metricType']): string {
  switch (metric) {
    case 'reps':
      return m.routine_metric_reps();
    case 'duration':
      return m.routine_metric_duration();
    case 'distance':
      return m.routine_metric_distance();
    default:
      return '';
  }
}

/**
 * Một bài trong ngày tập (.exrow): tay nắm, số thứ tự, tên, dòng dụng cụ · cách ghi tạ,
 * rồi dòng target. Chạm vào tên mở sheet chỉnh bài.
 */
function ExerciseRow({
  row,
  index,
  exercise,
  name,
  handle,
  onEdit,
}: {
  row: RoutineExercise;
  index: number;
  exercise: CatalogExercise | undefined;
  name: string;
  handle: React.ReactNode;
  onEdit: () => void;
}) {
  const hasHistory = useLiveQuery(
    async () => (await findLastTime(row.exerciseId)) !== null,
    [row.exerciseId],
    false,
  );
  const metric = exercise?.metricType ?? 'weight_reps';
  const details = [
    exercise?.equipment && equipmentLabel(exercise.equipment),
    metric === 'weight_reps'
      ? capitalize(
          loadLabel(equipmentDefaults(exercise?.equipment ?? null).loadInput),
        )
      : metricLabel(metric),
  ]
    .filter(Boolean)
    .join(' · ');
  const [first, ...rest] = targetParts(row, exercise, hasHistory);
  return (
    <Row className="items-start border-t-0 py-3 pr-7">
      {handle}
      <OrderNo n={index + 1} />
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 text-left leading-[1.3] font-semibold"
      >
        {name}
        {details && (
          <small className="block text-label leading-[1.35] font-normal">
            {details}
          </small>
        )}
        <span className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-label font-semibold">
          <span>
            <b className="text-read font-extrabold tracking-normal numeral">
              {first}
            </b>
          </span>
          {rest.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </span>
      </button>
    </Row>
  );
}
