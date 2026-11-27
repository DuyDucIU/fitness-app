import type {
  CatalogExercise,
  LoadInput,
  RoutineExercise,
  Suggestion,
} from '@fitness/contract';
import {
  afterSupersetSet,
  type LastTime,
  prefillFromLast,
  restSecondsFor,
  stepWeight,
  supersetOf,
  supersetRuns,
} from '@fitness/engine';
import * as React from 'react';
import { Navigate, useNavigate } from 'react-router';

import { equipmentLabel, exerciseNames } from '@/catalog/display';
import { ExercisePicker } from '@/catalog/exercise-search';
import { AppShell, Foot, TopBar } from '@/components/app-shell';
import { Bib, BibBand, BibPerf, BibStub, BibTip } from '@/components/bib';
import {
  Block,
  Row,
  RowCheck,
  RowEnd,
  RowKey,
  RowValue,
} from '@/components/block';
import { Chip, ChipGroup, ChipRow } from '@/components/chip';
import { Stepper } from '@/components/controls';
import { EmptyState } from '@/components/empty-state';
import { Field, NumberInput } from '@/components/field';
import {
  AddRestIcon,
  CheckIcon,
  LinkIcon,
  MinusIcon,
  MoreIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PlansIcon,
  SkipIcon,
  SwapIcon,
  TrashIcon,
} from '@/components/icons';
import { Menu, MenuItem } from '@/components/menu';
import { SyncPill } from '@/components/sync-pill';
import { useToast } from '@/components/toast-context';
import { useComingSoon } from '@/hooks/use-coming-soon';
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
import { useWakeLock } from '@/hooks/use-wake-lock';
import { formatElapsed, formatNumber, formatShortDate } from '@/lib/format';
import { getLocale } from '@/lib/i18n';
import { formatSeconds } from '@/routines/display';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  addExercise,
  answerBackOff,
  answerSuggestion,
  type ActiveBackOff,
  deleteSet,
  finishSession,
  logSet,
  moveSessionExercise,
  removeExercise,
  removeFromSuperset,
  restoreSet,
  swapExercise,
  toggleSuperset,
  type OpenExercise,
  type OpenSession,
  updateSet,
  useOpenSession,
} from '@/workout/session';
import {
  type SetDraft as Draft,
  draftFrom,
  exerciseName,
  loadLabel,
  type LogKind,
  logKind,
  pastSetTexts,
  recordTypeText,
  recordValueText,
  setText,
  setValuesOf,
} from '@/workout/display';
import { ExerciseSettingsFields } from '@/workout/exercise-settings-fields';
import { SessionSheet } from '@/workout/session-sheet';
import { unlockRestAlarm } from '@/workout/rest-alarm';
import { backOffText, hintText, tipText } from '@/workout/suggestion-text';
import { backOffParams } from '@/workout/suggestions';
import { type RestTimerState, useRestTimer } from '@/workout/rest-timer';

/**
 * Màn ghi buổi tập (prototypes/workout-log): buổi theo ngày tập có sẵn các bài với số set,
 * rep range và thời gian nghỉ theo target (UC06); tập tự do thì thêm bài từ catalog. Ghi /
 * sửa / xoá set, đổi thứ tự và superset (UC09), kết thúc buổi. Đọc buổi đang mở từ
 * IndexedDB nên reload hay mở lại app
 * vẫn tiếp tục được; không có buổi nào đang mở thì về Today.
 */
export function WorkoutLogPage() {
  const workout = useOpenSession();
  if (workout === undefined) return null;
  if (workout === null) return <Navigate to="/" replace />;
  return <WorkoutLog workout={workout} />;
}

/**
 * Bài ad hoc có sẵn 3 set chờ tập, như prototype (`makeEx(key, {sets:3})`); bài của ngày
 * tập thì theo số set của target.
 */
const DEFAULT_PLANNED_SETS = 3;

/**
 * Số điền sẵn cho working set thứ `index` (từ 0) theo lần trước (UC07 bước 3). Bài chưa
 * có lịch sử thì set đầu lấy tạ khởi điểm tĩnh của ngày tập nếu có, reps để user nhập
 * (R8). `null` khi không có gì để điền, hoặc lần trước ghi tạ theo quy ước khác.
 */
function prefillAt(item: OpenExercise, index: number): Draft | null {
  const initial = item.target?.initialWeightKg ?? null;
  if (
    item.lastTime === null &&
    index === 0 &&
    initial !== null &&
    logKind(item) === 'weight_reps'
  ) {
    return { weight: initial, reps: null };
  }
  const past = prefillFromLast(item.lastTime, index, item.row.loadInput);
  if (!past) return null;
  return {
    weight: logKind(item) === 'reps' ? null : past.weight,
    reps: past.reps,
  };
}

/**
 * Back-off đang áp (UC13) thay mức tạ của set chờ tập bằng mức gợi ý, giữ reps (UC07 bước 3:
 * gợi ý có kèm số điền sẵn ô nhập).
 */
function withBackOff(draft: Draft, backOff: ActiveBackOff | null): Draft {
  return backOff ? { ...draft, weight: backOff.weight } : draft;
}

function WorkoutLog({ workout }: { workout: OpenSession }) {
  const navigate = useNavigate();
  const toast = useToast();
  const now = useNow();
  const rest = useRestTimer(workout.session.id, now);
  // Giữ màn hình sáng suốt buổi (UC08); nhả khi rời màn, tức khi kết thúc buổi.
  useWakeLock();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [finishOpen, setFinishOpen] = React.useState(false);
  const [chosenId, setChosenId] = React.useState<string>();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  /** Bài đang được thay (UC09): picker mở ở chế độ thay bài cho bài này. */
  const [swapFrom, setSwapFrom] = React.useState<OpenExercise | null>(null);
  /** Sheet "Session": đổi thứ tự, superset, thêm bài (UC09). */
  const [sessionOpen, setSessionOpen] = React.useState(false);
  /**
   * Thời gian nghỉ (giây) user chỉnh cho từng bài trong buổi ở menu bài; chỉ là trạng thái
   * giao diện của buổi, không sửa `rest_seconds` của routine (SRS UC09).
   */
  const [restById, setRestById] = React.useState<Record<string, number>>({});
  const restOf = (item: OpenExercise) =>
    restById[item.row.id] ?? restSecondsFor(item.target?.restSeconds ?? null);
  // Chạm hàng PR mở màn PR của bài (UC17 bước 3).
  // #33
  const openRecords = useComingSoon();
  /** Set có PR mà user đã chạm: hàng trở lại ✓, chạm lần nữa là sửa set (prototype › prSeen). */
  const [seenRecords, setSeenRecords] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  /** PR vừa lập: dải số áo báo PR tới `until` (DESIGN.md › Mực, số cam: giữ 2,4 giây). */
  const [prFlash, setPrFlash] = React.useState<PrFlash | null>(null);
  React.useEffect(() => {
    if (!prFlash) return;
    const id = window.setTimeout(
      () => setPrFlash(null),
      prFlash.until - Date.now(),
    );
    return () => window.clearTimeout(id);
  }, [prFlash]);
  /**
   * Số set dự định theo bài, chỉ là trạng thái giao diện (SET_LOGS chỉ chứa set đã ghi).
   * Mặc định 3, "Add set" tăng thêm; không bao giờ ít hơn số set đã ghi.
   */
  const [plannedById, setPlannedById] = React.useState<Record<string, number>>(
    {},
  );
  const plannedOf = (item: OpenExercise) =>
    Math.max(
      plannedById[item.row.id] ??
        item.target?.targetSets ??
        DEFAULT_PLANNED_SETS,
      item.sets.length,
    );
  const remainingOf = (item: OpenExercise) =>
    logKind(item) === 'unsupported' ? 0 : plannedOf(item) - item.sets.length;

  const { session, exercises } = workout;
  const title = workout.day?.name ?? m.log_freestyle();
  // Chưa chọn bài: buổi theo ngày tập mở ở bài đầu còn set chờ tập (prototype bắt đầu từ
  // bài 1); tập tự do mở ở bài vừa thêm.
  const current =
    exercises.find((e) => e.row.id === chosenId) ??
    (workout.day ? exercises.find((e) => remainingOf(e) > 0) : undefined) ??
    exercises.at(-1);
  const logged = current?.sets ?? [];
  const planned = current ? plannedOf(current) : 0;
  const editing = logged.find((s) => s.id === editingId);
  const editingNo = editing ? logged.indexOf(editing) + 1 : 0;
  const nextNo = logged.length + 1;
  const allDone = !!current && logged.length >= planned;
  // Các bài theo thứ tự, cắt thành superset và bài lẻ (UC09).
  const lineup = exercises.map((item) => ({
    id: item.row.id,
    supersetGroup: item.row.supersetGroup,
    item,
  }));
  const runs = supersetRuns(lineup);
  const superset = current && supersetOf(lineup, current.row.id);
  const inSuperset = !!superset;

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
    setNextDraft(
      withBackOff(
        prefillAt(current, logged.length) ?? draftFrom(logged.at(-1)),
        current.backOff,
      ),
    );
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
  const range = current?.target ? repRangeText(current.target) : null;
  const values = setValuesOf(kind, draft);

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
      // Mở khoá âm báo ngay trong cú bấm, trước mọi `await` (iOS cần cử chỉ của user).
      unlockRestAlarm();
      const remainingAfter = (e: OpenExercise) =>
        remainingOf(e) - (e === current ? 1 : 0);
      // Tập xen kẽ trong superset (UC09): sang bài kế trong nhóm, chỉ nghỉ khi hết vòng.
      const step = afterSupersetSet(
        lineup.map((x) => ({ ...x, remaining: remainingAfter(x.item) })),
        current.row.id,
      );
      // Còn set chờ tập sau set này thì nghỉ; set cuối của cả buổi thì không (prototype).
      const restAfter =
        (step?.roundOver ?? true) &&
        exercises.some((e) => remainingAfter(e) > 0);
      const { backOff, records } = await logSet(
        current.row.id,
        values,
        remainingOf(current) - 1,
      );
      // Nghỉ theo `rest_seconds` của bài trong ngày tập, bài ad hoc thì mặc định (UC08); bài
      // tắt tự chạy rest timer (UC14) thì chờ user bấm nút bắt đầu nghỉ.
      if (restAfter && current.settings.restAutoStart)
        rest.start(restOf(current));
      else rest.skip();
      // Set kế tiếp (thứ tự nextNo tính từ 0) theo lần trước, không có thì giữ số vừa ghi;
      // có back-off thì lấy mức tạ của back-off.
      setNextDraft(withBackOff(prefillAt(current, nextNo) ?? values, backOff));
      if (step) setChosenId(step.nextId);
      // PR tạm (UC17): dải số áo báo tên bài và số mới; loại PR nằm ở hàng set và lời đọc.
      const [record] = records;
      const saved = m.log_set_saved({ n: nextNo });
      if (record) {
        const name = exerciseName(current);
        const value = recordValueText(kind, record, values.weight, values.reps);
        setPrFlash({
          name,
          value,
          until: prFlashUntil(),
        });
        toast.announce(
          `${saved} ${m.log_pr_announce({ name, type: recordTypeText(record), value })}`,
        );
      } else toast.announce(saved);
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

  /**
   * Bỏ bài hiện tại khỏi buổi (prototype › exMenu › remove): chưa ghi set thì bỏ hẳn bài;
   * đã ghi thì giữ các set đó, chỉ bỏ các set chờ tập.
   */
  async function removeCurrent() {
    if (!current) return;
    setMenuOpen(false);
    setEditingId(null);
    if (current.sets.length > 0) {
      const done = current.sets.length;
      setPlannedById((p) => ({ ...p, [current.row.id]: done }));
    } else {
      await removeExercise(current.row.id);
      setChosenId(undefined);
    }
  }

  /**
   * Đổi thứ tự hay superset không đổi bài đang tập, kể cả khi bài đó chưa được chọn tay
   * (đang là bài đầu còn set chờ).
   */
  function keepCurrent() {
    if (current) setChosenId(current.row.id);
  }

  async function move(id: string, to: number) {
    keepCurrent();
    const item = exercises.find((e) => e.row.id === id);
    if ((await moveSessionExercise(id, to)) && item) {
      toast.show(m.log_left_superset({ name: exerciseName(item) }));
    }
  }

  /** Mở picker ở chế độ thêm bài ad hoc. */
  function openAdd() {
    setSwapFrom(null);
    setPickerOpen(true);
  }

  /** Thêm bài ad hoc vào cuối buổi, hay thay bài `swapFrom` bằng bài vừa chọn. */
  async function pick(exercise: CatalogExercise) {
    setEditingId(null);
    if (!swapFrom) {
      setChosenId(await addExercise(session.id, exercise));
      return;
    }
    // Bài mới nhận các set còn chờ và thời gian nghỉ của bài cũ (hết set chờ thì như bài
    // ad hoc); bài cũ đã ghi set thì chỉ giữ các set đó, như khi bỏ bài.
    const old = swapFrom;
    const left = remainingOf(old) || DEFAULT_PLANNED_SETS;
    const restSeconds = restOf(old);
    const id = await swapExercise(old.row.id, exercise);
    setPlannedById((p) => ({
      ...p,
      [id]: left,
      ...(old.sets.length > 0 && { [old.row.id]: old.sets.length }),
    }));
    setRestById((r) => ({ ...r, [id]: restSeconds }));
    setChosenId(id);
    toast.show(
      m.log_swapped({ name: exerciseNames(exercise, getLocale()).name }),
    );
  }

  async function finish() {
    await finishSession(session.id);
    rest.skip();
    toast.show(m.log_finished());
    await navigate('/', { replace: true });
  }

  // Vùng đáy luôn chỉ một nút chính, như prototype.
  let dock: React.ReactNode;
  if (!current) {
    dock = (
      <Button variant="ink" size="go" onClick={openAdd}>
        <PlusIcon aria-hidden />
        {m.log_add_first_exercise()}
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

  // Điều khiển nghỉ ở vùng ngón cái, ngay trên nút chính (prototype › .restctl).
  // Ba nút bằng nhau: Dừng/Tiếp · +30 giây · Bỏ qua (DESIGN.md › Điều khiển nghỉ).
  const restButton = 'h-12 min-w-0 flex-1 px-2';
  // Bài tắt tự chạy rest timer: một nút bắt đầu nghỉ thay ba nút điều khiển
  // (prototype › rest-start). Nút thuộc bài đang tập đã có set; trong superset thì thuộc bài
  // ghi cuối khi vừa hết vòng, giữa vòng không có (UC09 bước 8).
  let restOwner = current && logged.length > 0 ? current : undefined;
  if (superset) {
    const last = lastLogged(superset.map((x) => x.item));
    const roundOver =
      last &&
      afterSupersetSet(
        superset.map((x) => ({ ...x, remaining: remainingOf(x.item) })),
        last.row.id,
      )?.roundOver;
    restOwner = roundOver ? last : undefined;
  }
  const restStart = !rest.left &&
    !editing &&
    restOwner &&
    !restOwner.settings.restAutoStart && (
      <Button
        variant="rest"
        className={restButton}
        onClick={() => rest.start(restOf(restOwner))}
      >
        <AddRestIcon aria-hidden />
        {m.log_rest_start({ time: formatSeconds(restOf(restOwner)) })}
      </Button>
    );
  const restControls = rest.left && !editing && (
    <>
      {rest.left.paused ? (
        <Button variant="rest" className={restButton} onClick={rest.resume}>
          <PlayIcon aria-hidden />
          {m.log_rest_resume()}
        </Button>
      ) : (
        <Button variant="rest" className={restButton} onClick={rest.pause}>
          <PauseIcon aria-hidden />
          {m.log_rest_pause()}
        </Button>
      )}
      <Button variant="rest" className={restButton} onClick={rest.add}>
        <AddRestIcon aria-hidden />
        {m.log_rest_add()}
      </Button>
      <Button variant="rest" className={restButton} onClick={rest.skip}>
        <SkipIcon aria-hidden />
        {m.log_rest_skip()}
      </Button>
    </>
  );

  let mode: BibMode;
  if (editing) mode = { type: 'edit', n: editingNo };
  else if (allDone) mode = { type: 'done', total: planned };
  else mode = { type: 'log', n: nextNo, total: planned };

  return (
    <AppShell
      top={
        <TopBar
          title={title}
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
      foot={<Foot controls={restControls || restStart} dock={dock} />}
    >
      <nav aria-label={m.log_exercises_label()}>
        {/* Chừa chỗ phía trên cho chú thích "SUPERSET" vắt trên mép ngoặc. */}
        <ChipRow className="pt-3">
          {runs.map((run) => {
            const chips = run.map(({ id, item }) => (
              <ExerciseChip
                key={id}
                index={exercises.indexOf(item)}
                name={exerciseName(item)}
                done={item.sets.length}
                total={plannedOf(item)}
                current={item === current}
                onClick={() => choose(item)}
              />
            ));
            return run.length > 1 ? (
              <ChipGroup key={run[0]!.id} label={m.log_superset()}>
                {chips}
              </ChipGroup>
            ) : (
              chips[0]
            );
          })}
          <Chip dashed onClick={() => setSessionOpen(true)}>
            <PlansIcon className="size-5" aria-hidden />
            {m.log_session()}
          </Chip>
        </ChipRow>
      </nav>
      {current ? (
        <>
          <SetBib
            item={current}
            kind={kind}
            mode={mode}
            draft={draft}
            rest={rest}
            // Dải PR đè mọi trạng thái của dải, kể cả đang sửa (prototype › flashPR).
            pr={prFlash && now < prFlash.until ? prFlash : null}
            onDraftChange={setDraft}
            onDelete={remove}
            onAddSet={addPlannedSet}
            onMenu={() => setMenuOpen(true)}
          />
          {kind !== 'unsupported' && (
            <Block>
              <div className="flex min-h-11 items-center gap-2 px-4 pt-1">
                <h2 className="leading-[1.2] font-bold">
                  {m.log_working_sets()}
                </h2>
                <span className="text-label font-semibold">
                  {logged.length}/{planned}
                  {range && <> · {range}</>}
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
                    // Set chờ tập sau đó: số dự kiến theo lần trước, mức tạ theo back-off
                    // nếu có; không có gì thì "–".
                    const prefill = prefillAt(current, i);
                    const past =
                      prefill || current.backOff
                        ? withBackOff(prefill ?? emptyDraft, current.backOff)
                        : null;
                    value = setText(
                      kind,
                      past?.weight ?? null,
                      past?.reps ?? null,
                    );
                  }
                  // Hàng PR (nền mực, chữ cam) tới khi user chạm vào (prototype › .prrow);
                  // đang sửa set đó thì là hàng hiện tại.
                  const [record] =
                    (set &&
                      !isCurrent &&
                      !seenRecords.has(set.id) &&
                      current.records.get(set.id)) ||
                    [];
                  return (
                    <li
                      key={set?.id ?? `planned-${i}`}
                      className="border-t border-rule-soft first:border-t-0"
                    >
                      <Row
                        asChild
                        tone={
                          record ? 'inverse' : isCurrent ? 'current' : 'default'
                        }
                        className="border-t-0"
                      >
                        <button
                          type="button"
                          aria-pressed={set ? set.id === editingId : undefined}
                          // Chạm set đã ghi để sửa; chạm hàng chờ để thoát sửa; chạm hàng
                          // PR thì mở màn PR của bài.
                          onClick={() => {
                            if (set && record) {
                              setSeenRecords((seen) =>
                                new Set(seen).add(set.id),
                              );
                              openRecords();
                            } else setEditingId(set ? set.id : null);
                          }}
                        >
                          <RowKey>
                            <span className="uppercase">
                              {m.log_set_tag({ n: i + 1 })}
                            </span>
                          </RowKey>{' '}
                          <RowValue>{value}</RowValue>
                          {record ? (
                            <RowEnd>
                              {' '}
                              {m.log_pr_row({ type: recordTypeText(record) })}
                            </RowEnd>
                          ) : set ? (
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
        <Bib>
          <BibBand open>{workout.day ? title : m.log_freestyle_band()}</BibBand>
          <EmptyState
            stat={0}
            action={
              <Button variant="ink" onClick={openAdd}>
                <PlusIcon aria-hidden />
                {m.log_add_exercise()}
              </Button>
            }
          >
            {m.log_empty()}
          </EmptyState>
        </Bib>
      )}

      <SessionSheet
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        name={title}
        items={lineup.map(({ id, supersetGroup, item }) => ({
          id,
          supersetGroup,
          name: exerciseName(item),
          done: item.sets.length,
          total: plannedOf(item),
          adHoc: item.row.routineExerciseId === null,
        }))}
        onMove={move}
        onToggle={(id) => {
          keepCurrent();
          void toggleSuperset(id);
        }}
        onAdd={() => {
          setSessionOpen(false);
          openAdd();
        }}
      />

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={
          swapFrom
            ? m.log_swap_title({ name: exerciseName(swapFrom) })
            : undefined
        }
        onPick={(exercise) => void pick(exercise)}
      />

      {current && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle>{exerciseName(current)}</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <Menu>
                <MenuItem
                  icon={<SwapIcon aria-hidden />}
                  sub={m.log_menu_swap_hint()}
                  onClick={() => {
                    setMenuOpen(false);
                    setSwapFrom(current);
                    setPickerOpen(true);
                  }}
                >
                  {m.log_menu_swap()}
                </MenuItem>
                <MenuItem
                  icon={<LinkIcon aria-hidden />}
                  sub={
                    inSuperset
                      ? m.log_menu_unsuperset_hint()
                      : m.log_menu_superset_hint()
                  }
                  // Bài cuối buổi không có bài kế để gộp.
                  disabled={!inSuperset && current === exercises.at(-1)}
                  onClick={() => {
                    setMenuOpen(false);
                    keepCurrent();
                    const change = inSuperset
                      ? removeFromSuperset
                      : toggleSuperset;
                    void change(current.row.id);
                  }}
                >
                  {inSuperset ? m.log_menu_unsuperset() : m.log_menu_superset()}
                </MenuItem>
                <MenuItem
                  icon={<PlansIcon aria-hidden />}
                  onClick={() => {
                    setMenuOpen(false);
                    setSessionOpen(true);
                  }}
                >
                  {m.log_menu_reorder()}
                </MenuItem>
              </Menu>
              {current.exercise && (
                <ExerciseSettingsFields
                  exercise={current.exercise}
                  settings={current.settings}
                  barLoadInput={current.row.loadInput}
                  loadHelp={
                    current.settings.loadInput !== current.row.loadInput
                      ? m.settings_load_next()
                      : undefined
                  }
                />
              )}
              <Field label={m.log_menu_rest()}>
                <Stepper
                  aria-label={m.log_menu_rest()}
                  value={restOf(current)}
                  step={15}
                  min={30}
                  max={1800}
                  format={formatSeconds}
                  onValueChange={(seconds) =>
                    setRestById((r) => ({ ...r, [current.row.id]: seconds }))
                  }
                  decreaseLabel={m.ex_rest_less()}
                  increaseLabel={m.ex_rest_more()}
                />
              </Field>
              <Menu className="mt-1 border-t border-rule-soft">
                <MenuItem
                  danger
                  icon={<TrashIcon aria-hidden />}
                  sub={m.log_menu_remove_hint()}
                  onClick={() => void removeCurrent()}
                >
                  {m.log_menu_remove()}
                </MenuItem>
              </Menu>
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}

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

/** Bài có set ghi gần đây nhất; `undefined`: chưa bài nào ghi set. */
function lastLogged(items: OpenExercise[]): OpenExercise | undefined {
  const at = (item: OpenExercise) => item.sets.at(-1)?.completedAt ?? '';
  return items
    .filter((item) => item.sets.length > 0)
    .sort((a, b) => at(a).localeCompare(at(b)))
    .at(-1);
}

/** "6–8 reps" theo rep range của bài trong ngày tập; `null` khi target không có rep range. */
function repRangeText({
  repMin,
  repMax,
}: Pick<RoutineExercise, 'repMin' | 'repMax'>): string | null {
  if (repMin === null || repMax === null) return null;
  return m.log_note_rep_range({
    min: formatNumber(repMin),
    max: formatNumber(repMax),
  });
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
  // Dải chip tự cuộn chip hiện tại vào tầm nhìn (DESIGN.md › Trong buổi tập).
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    // jsdom không có `scrollIntoView`.
    if (current)
      ref.current?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
    // `index` đổi khi đổi thứ tự: chip hiện tại dời chỗ.
  }, [current, index]);
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
      ref={ref}
      current={current}
      aria-current={current ? 'true' : undefined}
      aria-label={m.log_chip_label({ name, done, total })}
      onClick={onClick}
    >
      <b className="font-extrabold">{index + 1}</b>
      {name}
      {progress}
    </Chip>
  );
}

/** Thời gian dải số áo báo PR mới (DESIGN.md › Tấm số áo). */
const PR_FLASH_MS = 2400;

/** Mốc thôi hiện dải PR, tính lúc set vừa ghi lập PR. */
const prFlashUntil = () => Date.now() + PR_FLASH_MS;

/**
 * PR vừa lập, hiện trên dải số áo hiện tại kèm tên bài lập PR, kể cả khi set đó là set cuối
 * và màn đã sang bài kế (prototype › flashPR).
 */
interface PrFlash {
  name: string;
  /** Số mới: set vừa ghi, hay tổng volume của buổi. */
  value: string;
  /** Mốc thời điểm thôi hiện (ms). */
  until: number;
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
  rest: restTimer,
  pr,
  onDraftChange,
  onDelete,
  onAddSet,
  onMenu,
}: {
  item: OpenExercise;
  kind: LogKind;
  mode: BibMode;
  draft: Draft;
  /** Đang nghỉ thì dải số áo thành đồng hồ nghỉ; vừa hết giờ thì dải loé cam ba lần. */
  rest: RestTimerState;
  /** PR vừa lập: dải số áo thành mực, số cam, đè lên mọi trạng thái khác của dải. */
  pr: PrFlash | null;
  onDraftChange: (draft: Draft) => void;
  onDelete: () => void;
  onAddSet: () => void;
  /** Mở menu "⋯" của bài (prototype › exMenu): cài đặt bài, thay bài, bỏ bài. */
  onMenu: () => void;
}) {
  const equipment = item.exercise?.equipment ?? null;
  const { stepKg, barWeightKg } = item.settings;
  // Bài trong buổi giữ quy ước đã chụp (UC14), nên sàn của nút − theo quy ước đó.
  const { loadInput } = item.row;
  const ladder = { stepKg, barWeightKg, loadInput };
  const step = formatNumber(stepKg);
  const less = stepWeight(draft.weight, -1, ladder);

  const note = [
    equipment && equipmentLabel(equipment),
    kind === 'reps'
      ? m.log_note_reps_only()
      : loadInput === 'total' && barWeightKg
        ? m.log_note_bar({ bar: formatNumber(barWeightKg) })
        : loadLabel(loadInput),
    kind === 'weight_reps' && m.log_note_step({ step }),
    item.target && repRangeText(item.target),
  ]
    .filter(Boolean)
    .join(' · ');

  const bump = (value: number | null, by: number, start: number) =>
    value === null
      ? Math.max(0, start)
      : Math.max(0, Math.round((value + by) * 1000) / 1000);
  const name = exerciseName(item);
  // Nút "⋯" ở cuối dải (prototype › .band .more); lớp phủ của đồng hồ nghỉ có bản ẩn.
  const more = (hidden: boolean) => (
    <button
      type="button"
      className="-my-1.5 -mr-3 grid size-11 flex-none place-items-center rounded-sm active:bg-rule-soft"
      onClick={hidden ? undefined : onMenu}
      aria-label={hidden ? undefined : m.common_options_for({ name })}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <MoreIcon className="size-5" />
    </button>
  );

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
          disabled={less === null}
          onClick={() => {
            if (less !== null) onDraftChange({ ...draft, weight: less });
          }}
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
              weight: stepWeight(draft.weight, 1, ladder),
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

  const rest = restTimer.left;
  const flashClass = restTimer.flashing && 'animate-rest-over';
  const onAnimationEnd = restTimer.flashing ? restTimer.endFlash : undefined;
  let band: React.ReactNode;
  if (pr) {
    band = (
      <div
        role="group"
        aria-label={m.log_pr_label()}
        className="flex min-h-14 items-center gap-2.5 bg-ink py-1.5 pr-4 pl-4 text-tyvek"
      >
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">
          {m.log_pr_band({ name: pr.name })}
        </span>{' '}
        <b className="text-num leading-none whitespace-nowrap text-orange numeral">
          {pr.value}
        </b>
        {more(false)}
      </div>
    );
  } else if (rest && mode.type !== 'edit') {
    // Dải chính là đồng hồ nghỉ: lớp lam phủ lên rồi rút dần về bên trái (DESIGN.md › Nghỉ).
    const layer = (hidden: boolean) => (
      <div className="flex min-h-14 items-center gap-2 py-1.5 pr-4 pl-4">
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">
          {mode.type === 'done' ? m.log_done_name({ name }) : name}
        </span>
        {mode.type === 'log' && (
          <b className="border-r-2 border-current pr-2 text-num leading-none whitespace-nowrap numeral">
            {!hidden && (
              <span className="sr-only">
                {m.log_set_progress({ n: mode.n, total: mode.total })}
              </span>
            )}
            <span aria-hidden>
              {mode.n}/{mode.total}
            </span>
          </b>
        )}
        <b className="text-num leading-none whitespace-nowrap numeral">
          {/* Nhãn chữ dùng Be Vietnam Pro như prototype (.band .setno small), không theo font số. */}
          <small
            aria-hidden
            className="mr-1.5 align-[0.4em] font-sans label-caps"
          >
            {rest.paused ? m.log_rest_paused() : m.log_rest()}
          </small>
          <span
            role={hidden ? undefined : 'timer'}
            aria-label={hidden ? undefined : m.log_rest()}
          >
            {formatElapsed(rest.seconds * 1000)}
          </span>
        </b>
        {more(hidden)}
      </div>
    );
    band = (
      <div className="relative bg-tyvek text-ink shadow-[inset_0_0_0_2px_var(--color-blue)]">
        {layer(false)}
        {/* Lớp phủ chỉ để hiện tiến độ; chạm xuyên qua tới dải thật (nút "⋯") bên dưới. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-blue text-on-signal [transition:clip-path_0.25s_linear]"
          style={{ clipPath: `inset(0 ${(1 - rest.fraction) * 100}% 0 0)` }}
        >
          {layer(true)}
        </div>
      </div>
    );
  } else if (mode.type === 'edit') {
    band = (
      <div className="flex min-h-14 items-center gap-2 px-4 py-1.5 shadow-[inset_0_0_0_2px_var(--color-ink),inset_0_0_0_5px_var(--color-tyvek),inset_0_0_0_6px_var(--color-ink)]">
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">
          {m.log_edit_set_name({ n: mode.n, name })}
        </span>
        {more(false)}
      </div>
    );
  } else if (mode.type === 'done' || kind === 'unsupported') {
    band = (
      <div
        className={cn(
          'flex min-h-14 items-center gap-2 px-4 py-1.5 shadow-[inset_0_0_0_2px_var(--color-ink)]',
          flashClass,
        )}
        onAnimationEnd={onAnimationEnd}
      >
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">
          {mode.type === 'done' && kind !== 'unsupported'
            ? m.log_done_name({ name })
            : name}
        </span>
        {more(false)}
      </div>
    );
  } else {
    band = (
      <div
        className={cn(
          'flex min-h-14 items-center gap-2.5 bg-orange py-1.5 pr-4 pl-4 text-ink',
          flashClass,
        )}
        onAnimationEnd={onAnimationEnd}
      >
        <span className="line-clamp-2 min-w-0 flex-1 label-caps">{name}</span>
        <b className="text-num leading-none whitespace-nowrap uppercase numeral">
          {m.log_set_progress({ n: mode.n, total: mode.total })}
        </b>
        {more(false)}
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
      {item.tip && kind !== 'unsupported' && mode.type === 'log' ? (
        <TipStub item={item} />
      ) : item.backOff?.suggestion.status === 'pending' &&
        mode.type === 'log' ? (
        <BackOffStub
          backOff={item.backOff.suggestion}
          afterRecord={item.records.has(
            String(item.backOff.suggestion.payload.setLogId),
          )}
          onWeight={(weight) => onDraftChange({ ...draft, weight })}
        />
      ) : kind === 'unsupported' ||
        mode.type === 'edit' ? null : item.lastTime ? (
        <LastTimeStub
          kind={kind}
          lastTime={item.lastTime}
          loadInput={item.row.loadInput}
          hint={item.advice.hint && hintText(item.advice.hint, kind === 'reps')}
        />
      ) : (
        <>
          <BibPerf />
          {/* Số để trống: nhãn bên trái, lời nhắc bên phải như prototype. */}
          <BibStub label={m.log_no_history()} value="">
            {m.log_no_history_hint()}
          </BibStub>
        </>
      )}
    </section>
  );
}

/**
 * Gợi ý trước buổi chưa trả lời (UC12) thay cuống lần trước (prototypes/workout-log ›
 * .stub.tip) cho tới khi user bấm "Got it" hoặc ghi set đầu của bài. Gợi ý tăng chỉ nêu
 * hướng nên không đổi ô nhập (R1); số lần trước vẫn thấy ở các hàng set chờ.
 */
function TipStub({ item }: { item: OpenExercise }) {
  const tip = item.tip;
  if (!tip) return null;
  const metric = item.exercise?.metricType ?? 'weight_reps';
  const { text } = tipText(tip.suggestion, metric, item.row.loadInput, false);
  return (
    <>
      <BibPerf />
      <BibTip
        actions={
          <Button
            variant="line"
            onClick={() => void answerSuggestion(tip, 'accepted')}
          >
            {m.sug_got_it()}
          </Button>
        }
      >
        {text}
      </BibTip>
    </>
  );
}

/**
 * Gợi ý back-off chưa trả lời (UC13, R3) thay cuống lần trước (prototypes/workout-log ›
 * .stub.tip): ô tạ đã điền sẵn mức back-off; "OK" nhận, "Keep" trả ô tạ về mức cũ. Ghi set
 * mà chưa trả lời thì mức tạ thực ghi là câu trả lời.
 */
function BackOffStub({
  backOff,
  afterRecord,
  onWeight,
}: {
  backOff: Suggestion;
  /** Set gây back-off vừa lập PR: câu mở bằng lời chúc mừng. */
  afterRecord: boolean;
  onWeight: (weight: number) => void;
}) {
  const text = backOffText(backOff, afterRecord);
  const params = backOffParams(backOff);
  if (!text || !params) return null;
  const { from, to } = text;
  return (
    <>
      <BibPerf />
      <BibTip
        actions={
          <>
            <Button
              variant="ink"
              onClick={() => {
                onWeight(params.to);
                void answerBackOff(backOff.id, 'accepted');
              }}
            >
              {m.backoff_ok({ weight: to })}
            </Button>
            <Button
              variant="line"
              onClick={() => {
                onWeight(params.from);
                void answerBackOff(backOff.id, 'dismissed');
              }}
            >
              {m.backoff_keep({ weight: from })}
            </Button>
          </>
        }
      >
        {text.lead} {text.dropBefore} <b>{m.backoff_kg({ weight: to })}</b>{' '}
        {text.dropAfter}
      </BibTip>
    </>
  );
}

/**
 * Cuống vé dưới tấm số áo (prototypes/workout-log › .stub), tách khỏi mặt số bằng đường
 * răng cưa (DESIGN.md): ngày và các working set của lần tập gần nhất cùng bài (UC07 bước
 * 2). Lần trước ghi tạ theo quy ước khác thì nêu quy ước đó, để không so nhầm con số.
 * Câu nhắc ngắn (`hint`) nằm bên phải số, rộng tối đa nửa cuống; cuống hẹp thì xuống dưới
 * hàng số, không cắt chữ, không ẩn số.
 */
function LastTimeStub({
  kind,
  lastTime,
  loadInput,
  hint,
}: {
  kind: LogKind;
  lastTime: LastTime;
  loadInput: LoadInput;
  hint: string | null;
}) {
  const id = React.useId();
  let label: string = m.log_last_time({
    date: formatShortDate(new Date(lastTime.startedAt)),
  });
  if (kind === 'weight_reps' && lastTime.loadInput !== loadInput) {
    label += ` · ${loadLabel(lastTime.loadInput)}`;
  }
  return (
    <div role="note" aria-labelledby={id}>
      <BibPerf />
      <div className="@container px-4 pt-1 pb-4">
        <div className="grid grid-cols-1 items-center gap-x-4 gap-y-2 @[18rem]:grid-cols-[minmax(0,1fr)_minmax(0,50%)]">
          {/* Nhãn trên, số dưới như prototype, dù số ngắn hay dài. */}
          <div className="flex min-w-0 flex-col items-start gap-1">
            <span id={id} className="label-caps">
              {label}
            </span>{' '}
            <b className="text-num leading-none numeral">
              {pastSetTexts(kind, lastTime.sets).map((text, i) => (
                <React.Fragment key={i}>
                  {/* Dấu · giãn rộng hơn dấu × để không đọc nhầm số của hai set. */}
                  {i > 0 && <span className="mx-0.5"> · </span>}
                  <span className="whitespace-nowrap">{text}</span>
                </React.Fragment>
              ))}
            </b>
          </div>
          {hint && <p className="leading-[1.4]"> {hint}</p>}
        </div>
      </div>
    </div>
  );
}
