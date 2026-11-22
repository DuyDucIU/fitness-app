import type { LoadInput, SetLog } from '@fitness/contract';
import {
  equipmentDefaults,
  type LastTime,
  prefillFromLast,
} from '@fitness/engine';
import * as React from 'react';
import { Navigate, useNavigate } from 'react-router';

import { equipmentLabel } from '@/catalog/display';
import { ExercisePicker } from '@/catalog/exercise-search';
import { AppShell, Foot, TopBar } from '@/components/app-shell';
import {
  Block,
  Row,
  RowCheck,
  RowEnd,
  RowKey,
  RowValue,
} from '@/components/block';
import { Chip, ChipRow } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { NumberInput } from '@/components/field';
import { CheckIcon, MinusIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { SyncPill } from '@/components/sync-pill';
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
import { useNow } from '@/hooks/use-now';
import { formatElapsed, formatNumber, formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  addExercise,
  deleteSet,
  finishSession,
  logSet,
  restoreSet,
  type OpenExercise,
  type OpenSession,
  type SetValues,
  updateSet,
  useOpenSession,
} from '@/workout/session';
import {
  exerciseName,
  loadLabel,
  type LogKind,
  logKind,
  pastSetsText,
  setText,
} from '@/workout/display';

/**
 * Màn ghi buổi tập (prototypes/workout-log), phần cốt lõi của tập tự do: thêm bài từ
 * catalog, ghi / sửa / xoá set, kết thúc buổi. Đọc buổi đang mở từ IndexedDB nên reload
 * hay mở lại app vẫn tiếp tục được; không có buổi nào đang mở thì về Today.
 */
export function WorkoutLogPage() {
  const workout = useOpenSession();
  if (workout === undefined) return null;
  if (workout === null) return <Navigate to="/" replace />;
  return <WorkoutLog workout={workout} />;
}

/** Bài ad hoc có sẵn 3 set chờ tập, như prototype (`makeEx(key, {sets:3})`). */
const DEFAULT_PLANNED_SETS = 3;

interface Draft {
  weight: number | null;
  reps: number | null;
}

function draftFrom(set: SetLog | undefined): Draft {
  return { weight: set?.weightValue ?? null, reps: set?.reps ?? null };
}

/**
 * Số điền sẵn cho working set thứ `index` (từ 0) theo lần trước (UC07 bước 3);
 * `null` khi bài chưa có lịch sử hoặc lần trước ghi tạ theo quy ước khác.
 */
function prefillAt(item: OpenExercise, index: number): Draft | null {
  const past = prefillFromLast(item.lastTime, index, item.row.loadInput);
  if (!past) return null;
  return {
    weight: logKind(item) === 'reps' ? null : past.weight,
    reps: past.reps,
  };
}

function WorkoutLog({ workout }: { workout: OpenSession }) {
  const navigate = useNavigate();
  const toast = useToast();
  const now = useNow();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [finishOpen, setFinishOpen] = React.useState(false);
  const [chosenId, setChosenId] = React.useState<string>();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  /**
   * Số set dự định theo bài, chỉ là trạng thái giao diện (SET_LOGS chỉ chứa set đã ghi).
   * Mặc định 3, "Add set" tăng thêm; không bao giờ ít hơn số set đã ghi.
   */
  const [plannedById, setPlannedById] = React.useState<Record<string, number>>(
    {},
  );
  const plannedOf = (item: OpenExercise) =>
    Math.max(
      plannedById[item.row.id] ?? DEFAULT_PLANNED_SETS,
      item.sets.length,
    );
  const remainingOf = (item: OpenExercise) =>
    logKind(item) === 'unsupported' ? 0 : plannedOf(item) - item.sets.length;

  const { session, exercises } = workout;
  const current =
    exercises.find((e) => e.row.id === chosenId) ?? exercises.at(-1);
  const logged = current?.sets ?? [];
  const planned = current ? plannedOf(current) : 0;
  const editing = logged.find((s) => s.id === editingId);
  const editingNo = editing ? logged.indexOf(editing) + 1 : 0;
  const nextNo = logged.length + 1;
  const allDone = !!current && logged.length >= planned;

  // Hai bản nháp riêng, để sửa set cũ không đụng tới số của set chuẩn bị tập.
  // - Set chuẩn bị tập: điền sẵn đúng set đó của lần trước (UC07 bước 3); bài chưa có lịch sử
  //   thì lấy set vừa ghi của bài, chưa ghi set nào thì để trống (R8). Chỉ làm mới khi
  //   đổi bài và ngay sau khi ghi set; làm mới lúc IndexedDB báo về sẽ xoá mất chỉnh
  //   sửa user bấm ngay sau khi ghi.
  // - Set đang sửa: lấy số của set đó mỗi khi bắt đầu sửa.
  const emptyDraft: Draft = { weight: null, reps: null };
  const [nextDraft, setNextDraft] = React.useState<Draft>(emptyDraft);
  const [nextFor, setNextFor] = React.useState<string>();
  if (current && nextFor !== current.row.id) {
    setNextFor(current.row.id);
    setNextDraft(prefillAt(current, logged.length) ?? draftFrom(logged.at(-1)));
  }
  const [editDraft, setEditDraft] = React.useState<Draft>(emptyDraft);
  const [editFor, setEditFor] = React.useState<string>();
  if (editing && editFor !== editing.id) {
    setEditFor(editing.id);
    setEditDraft(draftFrom(editing));
  }
  const draft = editing ? editDraft : nextDraft;
  const setDraft = editing ? setEditDraft : setNextDraft;

  const kind = current ? logKind(current) : 'unsupported';
  const values: SetValues | null =
    draft.reps !== null &&
    Number.isInteger(draft.reps) &&
    draft.reps > 0 &&
    (kind === 'reps' || (draft.weight !== null && draft.weight >= 0))
      ? { weight: kind === 'reps' ? null : draft.weight, reps: draft.reps }
      : null;

  function choose(item: OpenExercise) {
    setChosenId(item.row.id);
    setEditingId(null);
  }

  function addPlannedSet() {
    if (!current) return;
    setPlannedById((p) => ({ ...p, [current.row.id]: planned + 1 }));
    setEditingId(null);
  }

  async function submit() {
    if (!current || !values) return;
    if (editing) {
      await updateSet(editing.id, values);
      setEditingId(null);
    } else {
      await logSet(current.row.id, values);
      // Set kế tiếp (thứ tự nextNo tính từ 0) theo lần trước; không có thì giữ số vừa ghi.
      const next = prefillAt(current, nextNo);
      if (next) setNextDraft(next);
      toast.announce(m.log_set_saved({ n: nextNo }));
    }
  }

  async function remove() {
    if (!editing) return;
    const { id } = editing;
    await deleteSet(id);
    setEditingId(null);
    toast.show(m.log_set_deleted({ n: editingNo }), {
      action: { label: m.common_undo(), onClick: () => void restoreSet(id) },
      durationMs: 5000,
    });
  }

  async function finish() {
    await finishSession(session.id);
    toast.show(m.log_finished());
    await navigate('/', { replace: true });
  }

  // Vùng đáy luôn chỉ một nút chính, như prototype.
  let dock: React.ReactNode;
  if (!current) {
    dock = (
      <Button variant="ink" size="go" onClick={() => setPickerOpen(true)}>
        <PlusIcon aria-hidden />
        {m.log_add_exercise()}
      </Button>
    );
  } else if (editing) {
    dock = (
      <Button variant="ink" size="go" disabled={!values} onClick={submit}>
        <CheckIcon aria-hidden />
        {m.log_save_set({ n: editingNo })}
      </Button>
    );
  } else if (kind === 'unsupported' || allDone) {
    const next = exercises.find((e) => e !== current && remainingOf(e) > 0);
    dock = next ? (
      <Button variant="ink" size="go" onClick={() => choose(next)}>
        {m.log_next({ name: exerciseName(next) })}
      </Button>
    ) : (
      <Button variant="ink" size="go" onClick={() => setFinishOpen(true)}>
        {m.log_finish_confirm()}
      </Button>
    );
  } else {
    dock = (
      <Button variant="orange" size="go" disabled={!values} onClick={submit}>
        {m.log_log_set({ n: nextNo })}
      </Button>
    );
  }

  let mode: BibMode;
  if (editing) mode = { type: 'edit', n: editingNo };
  else if (allDone) mode = { type: 'done', total: planned };
  else mode = { type: 'log', n: nextNo, total: planned };

  return (
    <AppShell
      top={
        <TopBar
          title={m.log_freestyle()}
          sub={
            // Đồng hồ cỡ số phụ 28px như prototype (.top .clock), không phải dòng phụ 12px.
            <time
              aria-label={m.log_elapsed_label()}
              className="block text-num leading-none numeral"
            >
              {formatElapsed(now - Date.parse(session.startedAt))}
            </time>
          }
          right={
            <>
              <SyncPill />
              <Button onClick={() => setFinishOpen(true)}>
                {m.log_finish()}
              </Button>
            </>
          }
        />
      }
      foot={<Foot dock={dock} />}
    >
      {current ? (
        <>
          <nav aria-label={m.log_exercises_label()}>
            <ChipRow>
              {exercises.map((item, i) => (
                <ExerciseChip
                  key={item.row.id}
                  index={i}
                  name={exerciseName(item)}
                  done={item.sets.length}
                  total={plannedOf(item)}
                  current={item === current}
                  onClick={() => choose(item)}
                />
              ))}
              <Chip dashed onClick={() => setPickerOpen(true)}>
                <PlusIcon className="size-5" aria-hidden />
                {m.log_add_exercise()}
              </Chip>
            </ChipRow>
          </nav>
          <SetBib
            item={current}
            kind={kind}
            mode={mode}
            draft={draft}
            onDraftChange={setDraft}
            onDelete={remove}
            onAddSet={addPlannedSet}
          />
          {kind !== 'unsupported' && (
            <Block>
              <div className="flex min-h-11 items-center gap-2 px-4 pt-1">
                <h2 className="leading-[1.2] font-bold">
                  {m.log_working_sets()}
                </h2>
                <span className="text-label font-semibold">
                  {logged.length}/{planned}
                </span>
              </div>
              <ul
                aria-label={m.log_working_sets()}
                className="border-t border-rule-soft"
              >
                {Array.from({ length: planned }, (_, i) => {
                  const set = logged[i];
                  const isNext = !set && i === logged.length;
                  const isCurrent = set
                    ? set.id === editingId
                    : !editing && isNext;
                  let value: string;
                  if (set) value = setText(kind, set.weightValue, set.reps);
                  // Set chuẩn bị tập luôn hiện số sẽ ghi, kể cả khi đang sửa set khác.
                  else if (isNext)
                    value = setText(kind, nextDraft.weight, nextDraft.reps);
                  else {
                    // Set chờ tập sau đó: số dự kiến theo lần trước, chưa có thì "–".
                    const past = prefillAt(current, i);
                    value = setText(
                      kind,
                      past?.weight ?? null,
                      past?.reps ?? null,
                    );
                  }
                  return (
                    <li
                      key={set?.id ?? `planned-${i}`}
                      className="border-t border-rule-soft first:border-t-0"
                    >
                      <Row
                        asChild
                        tone={isCurrent ? 'current' : 'default'}
                        className="border-t-0"
                      >
                        <button
                          type="button"
                          aria-pressed={set ? set.id === editingId : undefined}
                          // Chạm set đã ghi để sửa; chạm hàng chờ để thoát sửa.
                          onClick={() => setEditingId(set ? set.id : null)}
                        >
                          <RowKey>
                            <span className="uppercase">
                              {m.log_set_tag({ n: i + 1 })}
                            </span>
                          </RowKey>{' '}
                          <RowValue>{value}</RowValue>
                          {set ? (
                            <span className="ml-auto">
                              <RowCheck label={m.log_logged()} />
                            </span>
                          ) : (
                            isCurrent && <RowEnd> {m.log_now()}</RowEnd>
                          )}
                        </button>
                      </Row>
                    </li>
                  );
                })}
              </ul>
              <Row asChild tone="add">
                <button type="button" onClick={addPlannedSet}>
                  <PlusIcon className="size-5" aria-hidden />
                  {m.log_add_set()}
                </button>
              </Row>
            </Block>
          )}
        </>
      ) : (
        <Block>
          <div className="flex min-h-14 items-center rounded-t-md px-4 label-caps shadow-[inset_0_0_0_2px_var(--color-ink)]">
            {m.log_freestyle()}
          </div>
          <EmptyState stat={0}>{m.log_empty()}</EmptyState>
        </Block>
      )}

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={async (exercise) => {
          const id = await addExercise(session.id, exercise);
          setChosenId(id);
          setEditingId(null);
        }}
      />

      <Sheet open={finishOpen} onOpenChange={setFinishOpen}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{m.log_finish_title()}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <p>{m.log_finish_sets({ count: workout.setCount })}</p>
          </SheetBody>
          <SheetFooter>
            <Button
              variant="line"
              size="wide"
              onClick={() => setFinishOpen(false)}
            >
              {m.log_keep_going()}
            </Button>
            <Button variant="ink" size="wide" onClick={finish}>
              {m.log_finish_confirm()}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

/** Chip bài trong dải bài (prototype › chipHTML): số thứ tự, tên, chấm tiến độ hoặc ✓. */
function ExerciseChip({
  index,
  name,
  done,
  total,
  current,
  onClick,
}: {
  index: number;
  name: string;
  done: number;
  total: number;
  current: boolean;
  onClick: () => void;
}) {
  let progress: React.ReactNode = null;
  if (done > 0 && done >= total) {
    progress = (
      <CheckIcon className="size-5 text-green" strokeWidth={3} aria-hidden />
    );
  } else if (total <= 6) {
    progress = (
      <span aria-hidden className="flex gap-0.75">
        {Array.from({ length: total }, (_, k) => (
          <i
            key={k}
            className={cn(
              'size-1.5 rounded-full',
              k < done ? 'bg-ink' : 'bg-rule',
            )}
          />
        ))}
      </span>
    );
  }
  return (
    <Chip
      current={current}
      aria-current={current ? 'true' : undefined}
      aria-label={m.log_chip_label({ name, done, total })}
      onClick={onClick}
    >
      <b className="numeral">{index + 1}</b>
      {name}
      {progress}
    </Chip>
  );
}

/** Trạng thái tấm số áo: đang ghi set n/total, đang sửa set n, hay đã xong mọi set. */
type BibMode =
  | { type: 'log'; n: number; total: number }
  | { type: 'edit'; n: number }
  | { type: 'done'; total: number };

/**
 * Tấm số áo của bài hiện tại (prototypes/workout-log › .bib). Dải đầu: cam "TÊN BÀI ·
 * SET 3/4" khi ghi; viền mực "Edit set 2 · Tên bài" kèm nút xoá khi sửa; viền mực
 * "Tên bài · done" khi xong. Mặt số là ô nhập tạ × reps (hoặc chỉ reps) với nút −/+ theo
 * bậc tạ của dụng cụ; xong mọi set thì hiện "3/3" và nút thêm set.
 */
function SetBib({
  item,
  kind,
  mode,
  draft,
  onDraftChange,
  onDelete,
  onAddSet,
}: {
  item: OpenExercise;
  kind: LogKind;
  mode: BibMode;
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  onDelete: () => void;
  onAddSet: () => void;
}) {
  const equipment = item.exercise?.equipment ?? null;
  const { stepKg, barWeightKg } = equipmentDefaults(equipment);
  const { loadInput } = item.row;
  const step = formatNumber(stepKg);

  const note = [
    equipment && equipmentLabel(equipment),
    kind === 'reps'
      ? m.log_note_reps_only()
      : loadInput === 'total' && barWeightKg
        ? m.log_note_bar({ bar: formatNumber(barWeightKg) })
        : loadLabel(loadInput),
    kind === 'weight_reps' && m.log_note_step({ step }),
  ]
    .filter(Boolean)
    .join(' · ');

  const bump = (value: number | null, by: number, start: number) =>
    value === null
      ? Math.max(0, start)
      : Math.max(0, Math.round((value + by) * 1000) / 1000);

  const big =
    'h-20 w-full border-0 bg-transparent p-0 text-center text-bib-md shadow-none focus:bg-orange-tint';
  const adj =
    'grid h-11 w-12 place-items-center rounded-sm border-[1.5px] border-ink active:bg-ink active:text-tyvek disabled:opacity-40';

  const weightCell = (
    <div className="flex min-w-0 flex-col items-center">
      <NumberInput
        aria-label={m.log_weight_label({ load: loadLabel(loadInput) })}
        placeholder="–"
        value={draft.weight}
        onValueChange={(weight) => onDraftChange({ ...draft, weight })}
        className={big}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={adj}
          aria-label={m.log_weight_less({ step })}
          disabled={!draft.weight}
          onClick={() =>
            onDraftChange({ ...draft, weight: bump(draft.weight, -stepKg, 0) })
          }
        >
          <MinusIcon className="size-5" aria-hidden />
        </button>
        <span className="min-w-11 text-center label-caps">
          {m.log_unit_kg()}
        </span>
        <button
          type="button"
          className={adj}
          aria-label={m.log_weight_more({ step })}
          onClick={() =>
            onDraftChange({
              ...draft,
              weight: bump(draft.weight, stepKg, barWeightKg ?? stepKg),
            })
          }
        >
          <PlusIcon className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );

  const repsCell = (
    <div className="flex min-w-0 flex-col items-center">
      <NumberInput
        aria-label={m.log_reps_label()}
        placeholder="–"
        maxFractionDigits={0}
        value={draft.reps}
        onValueChange={(reps) => onDraftChange({ ...draft, reps })}
        className={big}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={adj}
          aria-label={m.log_rep_fewer()}
          disabled={!draft.reps}
          onClick={() =>
            onDraftChange({ ...draft, reps: bump(draft.reps, -1, 0) })
          }
        >
          <MinusIcon className="size-5" aria-hidden />
        </button>
        <span className="min-w-11 text-center label-caps">
          {m.log_unit_reps()}
        </span>
        <button
          type="button"
          className={adj}
          aria-label={m.log_rep_more()}
          onClick={() =>
            onDraftChange({ ...draft, reps: bump(draft.reps, 1, 1) })
          }
        >
          <PlusIcon className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );

  const name = exerciseName(item);
  let band: React.ReactNode;
  if (mode.type === 'edit') {
    band = (
      <div className="flex min-h-14 items-center px-4 py-1.5 shadow-[inset_0_0_0_2px_var(--color-ink),inset_0_0_0_5px_var(--color-tyvek),inset_0_0_0_6px_var(--color-ink)]">
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">
          {m.log_edit_set_name({ n: mode.n, name })}
        </span>
      </div>
    );
  } else if (mode.type === 'done' || kind === 'unsupported') {
    band = (
      <div className="flex min-h-14 items-center px-4 py-1.5 shadow-[inset_0_0_0_2px_var(--color-ink)]">
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">
          {mode.type === 'done' && kind !== 'unsupported'
            ? m.log_done_name({ name })
            : name}
        </span>
      </div>
    );
  } else {
    band = (
      <div className="flex min-h-14 items-center gap-2.5 bg-orange py-1.5 pr-4 pl-4 text-ink">
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">{name}</span>
        <b className="text-num leading-none whitespace-nowrap uppercase numeral">
          {m.log_set_progress({ n: mode.n, total: mode.total })}
        </b>
      </div>
    );
  }

  return (
    <section aria-label={name} className="overflow-hidden rounded-md bg-tyvek">
      {band}
      {kind === 'unsupported' ? (
        <EmptyState>{m.log_unsupported()}</EmptyState>
      ) : mode.type === 'done' ? (
        <EmptyState
          stat={`${mode.total}/${mode.total}`}
          action={
            <Button variant="line" onClick={onAddSet}>
              <PlusIcon aria-hidden />
              {m.log_add_set()}
            </Button>
          }
        >
          {m.log_all_done({ name })}
        </EmptyState>
      ) : (
        <>
          <div
            className={cn(
              'grid items-start px-2 pt-3.5 pb-2',
              kind === 'reps'
                ? 'grid-cols-1'
                : 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
            )}
          >
            {kind === 'weight_reps' && (
              <>
                {weightCell}
                <span
                  aria-hidden
                  className="px-0.5 pt-5 text-[40px] leading-none font-semibold"
                >
                  ×
                </span>
              </>
            )}
            {repsCell}
          </div>
          <p className="px-4 pb-3 text-center text-label font-semibold">
            {note}
          </p>
          {mode.type === 'edit' && (
            // Xoá set: thao tác hiếm, đặt dưới mặt số cho xa nút lưu ở vùng ngón cái;
            // góc phải dải đầu dành cho menu "⋯" của bài (#22, #23).
            <div className="flex justify-center border-t-2 border-dashed border-rule py-1.5">
              <Button variant="text" className="text-danger" onClick={onDelete}>
                <TrashIcon aria-hidden />
                {m.log_delete_set({ n: mode.n })}
              </Button>
            </div>
          )}
        </>
      )}
      {item.lastTime && kind !== 'unsupported' && mode.type !== 'edit' && (
        <LastTimeStub
          kind={kind}
          lastTime={item.lastTime}
          loadInput={item.row.loadInput}
        />
      )}
    </section>
  );
}

/**
 * Cuống vé dưới tấm số áo (prototypes/workout-log › .stub), tách khỏi mặt số bằng đường
 * răng cưa (DESIGN.md): ngày và các working set của lần tập gần nhất cùng bài (UC07 bước
 * 2). Lần trước ghi tạ theo quy ước khác thì nêu quy ước đó, để không so nhầm con số.
 */
function LastTimeStub({
  kind,
  lastTime,
  loadInput,
}: {
  kind: LogKind;
  lastTime: LastTime;
  loadInput: LoadInput;
}) {
  const id = React.useId();
  const notch = 'absolute top-0 size-4.5 rounded-full bg-ground';
  let label: string = m.log_last_time({
    date: formatShortDate(new Date(lastTime.startedAt)),
  });
  if (kind === 'weight_reps' && lastTime.loadInput !== loadInput) {
    label += ` · ${loadLabel(lastTime.loadInput)}`;
  }
  return (
    <div role="note" aria-labelledby={id}>
      <div aria-hidden className="relative h-4.5">
        <i className="absolute inset-x-3.5 top-2 border-t-2 border-dashed border-rule" />
        <i className={cn(notch, '-left-2.25')} />
        <i className={cn(notch, '-right-2.25')} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-1 pb-4">
        <span id={id} className="label-caps">
          {label}
        </span>{' '}
        <b className="text-num leading-none numeral">
          {pastSetsText(kind, lastTime.sets)}
        </b>
      </div>
    </div>
  );
}
