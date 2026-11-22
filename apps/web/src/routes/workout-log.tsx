import type { LoadInput, SetLog } from '@fitness/contract';
import { equipmentDefaults } from '@fitness/engine';
import * as React from 'react';
import { Navigate, useNavigate } from 'react-router';

import { equipmentLabel, exerciseNames } from '@/catalog/display';
import { ExercisePicker } from '@/catalog/exercise-search';
import { AppShell, Foot, TopBar } from '@/components/app-shell';
import { Block, Row, RowCheck, RowKey, RowValue } from '@/components/block';
import { Chip, ChipRow } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { NumberInput } from '@/components/field';
import { MinusIcon, PlusIcon, TrashIcon } from '@/components/icons';
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
import { formatElapsed, formatNumber } from '@/lib/format';
import { getLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  addExercise,
  deleteSet,
  finishSession,
  logSet,
  type OpenExercise,
  type OpenSession,
  type SetValues,
  updateSet,
  useOpenSession,
} from '@/workout/session';

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

function loadLabel(loadInput: LoadInput): string {
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

/** Bài ghi bằng tạ × reps, chỉ reps, hay chưa ghi được (thời gian, quãng đường). */
function logKind(item: OpenExercise): 'weight_reps' | 'reps' | 'unsupported' {
  const metric = item.exercise?.metricType ?? 'weight_reps';
  return metric === 'weight_reps' || metric === 'reps' ? metric : 'unsupported';
}

function exerciseName(item: OpenExercise): string {
  return item.exercise
    ? exerciseNames(item.exercise, getLocale()).name
    : m.log_unknown_exercise();
}

/** "80 × 8" hoặc "12 reps". */
function setText(set: SetLog): string {
  const reps = set.reps ?? 0;
  return set.weightValue === null
    ? `${reps} ${m.log_unit_reps()}`
    : `${formatNumber(set.weightValue)} × ${reps}`;
}

interface Draft {
  weight: number | null;
  reps: number | null;
}

function draftFrom(set: SetLog | undefined): Draft {
  return { weight: set?.weightValue ?? null, reps: set?.reps ?? null };
}

function WorkoutLog({ workout }: { workout: OpenSession }) {
  const navigate = useNavigate();
  const toast = useToast();
  const now = useNow();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [finishOpen, setFinishOpen] = React.useState(false);
  const [chosenId, setChosenId] = React.useState<string>();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { session, exercises } = workout;
  const current =
    exercises.find((e) => e.row.id === chosenId) ?? exercises.at(-1);
  const editing = current?.sets.find((s) => s.id === editingId);
  const editingNo = editing ? current!.sets.indexOf(editing) + 1 : 0;
  const nextNo = (current?.sets.length ?? 0) + 1;

  // Ô nhập: sửa set thì lấy số của set đó; set mới thì điền sẵn set vừa ghi của bài
  // (chưa có thì để trống — R8). Làm mới mỗi khi đổi bài, ghi xong hay bắt đầu sửa.
  const draftKey = `${current?.row.id}:${editing?.id ?? nextNo}`;
  const [draft, setDraft] = React.useState<Draft>({
    weight: null,
    reps: null,
  });
  const [draftFor, setDraftFor] = React.useState<string>();
  if (draftFor !== draftKey) {
    setDraftFor(draftKey);
    setDraft(draftFrom(editing ?? current?.sets.at(-1)));
  }

  const kind = current ? logKind(current) : 'unsupported';
  const values: SetValues | null =
    draft.reps !== null &&
    Number.isInteger(draft.reps) &&
    draft.reps > 0 &&
    (kind === 'reps' || (draft.weight !== null && draft.weight >= 0))
      ? { weight: kind === 'reps' ? null : draft.weight, reps: draft.reps }
      : null;

  async function submit() {
    if (!current || !values) return;
    if (editing) {
      await updateSet(editing.id, values);
      setEditingId(null);
    } else {
      await logSet(current.row.id, values);
      toast.announce(m.log_set_saved({ n: nextNo }));
    }
  }

  async function remove() {
    if (!editing) return;
    await deleteSet(editing.id);
    setEditingId(null);
  }

  async function finish() {
    await finishSession(session.id);
    toast.show(m.log_finished());
    await navigate('/', { replace: true });
  }

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
      <>
        <Button
          variant="danger"
          size="icon"
          className="h-16 w-16 flex-none"
          aria-label={m.log_delete_set({ n: editingNo })}
          onClick={remove}
        >
          <TrashIcon aria-hidden />
        </Button>
        <Button
          variant="line"
          size="go"
          className="w-auto flex-none px-4"
          onClick={() => setEditingId(null)}
        >
          {m.common_cancel()}
        </Button>
        <Button variant="ink" size="go" disabled={!values} onClick={submit}>
          {m.log_save_set({ n: editingNo })}
        </Button>
      </>
    );
  } else if (kind !== 'unsupported') {
    dock = (
      <Button variant="orange" size="go" disabled={!values} onClick={submit}>
        {m.log_log_set({ n: nextNo })}
      </Button>
    );
  }

  return (
    <AppShell
      top={
        <TopBar
          title={m.log_freestyle()}
          sub={
            <time aria-label={m.log_elapsed_label()} className="numeral">
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
                <Chip
                  key={item.row.id}
                  current={item === current}
                  aria-current={item === current ? 'true' : undefined}
                  onClick={() => {
                    setChosenId(item.row.id);
                    setEditingId(null);
                  }}
                >
                  <b className="numeral">{i + 1}</b>
                  {exerciseName(item)}
                  {item.sets.length > 0 && (
                    <span className="text-label">· {item.sets.length}</span>
                  )}
                </Chip>
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
            tag={
              editing
                ? m.log_edit_set({ n: editingNo })
                : m.log_set_tag({ n: nextNo })
            }
            editing={!!editing}
            draft={draft}
            onDraftChange={setDraft}
          />
          <Block>
            {current.sets.length === 0 ? (
              <p className="px-4 py-3.5">{m.log_no_sets()}</p>
            ) : (
              <ul aria-label={m.log_logged_sets()}>
                {current.sets.map((set, i) => (
                  <li
                    key={set.id}
                    className="border-t border-rule-soft first:border-t-0"
                  >
                    <Row
                      asChild
                      tone={set.id === editingId ? 'current' : 'default'}
                      className="border-t-0"
                    >
                      <button
                        type="button"
                        aria-pressed={set.id === editingId}
                        onClick={() =>
                          setEditingId(set.id === editingId ? null : set.id)
                        }
                      >
                        <RowKey>{m.log_set_tag({ n: i + 1 })}</RowKey>{' '}
                        <RowValue>{setText(set)}</RowValue>
                        <span className="ml-auto">
                          <RowCheck />
                        </span>
                      </button>
                    </Row>
                  </li>
                ))}
              </ul>
            )}
          </Block>
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

/**
 * Tấm số áo của bài hiện tại: dải cam mang tên bài và số set, mặt số là ô nhập tạ × reps
 * (hoặc chỉ reps) với nút −/+ theo bậc tạ của dụng cụ.
 */
function SetBib({
  item,
  kind,
  tag,
  editing,
  draft,
  onDraftChange,
}: {
  item: OpenExercise;
  kind: ReturnType<typeof logKind>;
  tag: string;
  editing: boolean;
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
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

  return (
    <section
      aria-label={
        exerciseNames(
          item.exercise ?? { nameEn: m.log_unknown_exercise(), nameVi: null },
          getLocale(),
        ).name
      }
      className="overflow-hidden rounded-md bg-tyvek"
    >
      <div
        className={cn(
          'flex min-h-14 items-center gap-2.5 py-1.5 pr-4 pl-4',
          editing
            ? 'shadow-[inset_0_0_0_2px_var(--color-ink)]'
            : 'bg-orange text-ink',
        )}
      >
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">
          {exerciseName(item)}
        </span>
        <b className="text-num leading-none whitespace-nowrap numeral">{tag}</b>
      </div>
      {kind === 'unsupported' ? (
        <EmptyState>{m.log_unsupported()}</EmptyState>
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
        </>
      )}
    </section>
  );
}
