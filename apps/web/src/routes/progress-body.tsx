import {
  type BodyMetric,
  type BodyMetricKind,
  BODY_METRICS,
  isBodyMetricValueValid,
} from '@fitness/contract';
import * as React from 'react';

import { SectionHeading } from '@/components/app-shell';
import { Block, Row, RowEnd, RowTitle, RowValue } from '@/components/block';
import { Chart } from '@/components/chart';
import { Segmented } from '@/components/controls';
import { Alert } from '@/components/empty-state';
import { Field, TextInput } from '@/components/field';
import { AlertIcon, TrashIcon } from '@/components/icons';
import { Note } from '@/components/text';
import { useToast } from '@/components/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  formatNumber,
  formatShortDate,
  formatTime,
  parseDecimal,
} from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import {
  BlockHeading,
  NoticeBib,
  ProgressTabs,
} from '@/progress/progress-parts';
import { useBodyMetrics } from '@/progress/use-body-metrics';
import { RootScreen } from '@/routes/root-screens';

/** Số lần đo hiện trong danh sách (prototype progress › bodyView). */
const LIST_LIMIT = 10;
/** Ít lần đo hơn số này thì chấm mọi điểm trên đường. */
const DOT_BELOW = 6;

/** Chữ của từng chỉ số: tên, tên giữa câu ("No weight entries yet.") và đơn vị lưu/hiển thị. */
// #38: cân nặng nhập và hiển thị theo `unitPref` (kg/lb) khi có cài đặt đơn vị; lưu vẫn bằng kg.
const METRIC_TEXT: Record<
  BodyMetricKind,
  { name: () => string; noun: () => string; unit: () => string }
> = {
  weight: { name: m.body_weight, noun: m.body_weight_lower, unit: m.unit_kg },
  waist: { name: m.body_waist, noun: m.body_waist_lower, unit: m.unit_cm },
  body_fat: {
    name: m.body_body_fat,
    noun: m.body_body_fat_lower,
    unit: m.unit_percent,
  },
};
const metricName = (metric: BodyMetricKind) => METRIC_TEXT[metric].name();
const metricNoun = (metric: BodyMetricKind) => METRIC_TEXT[metric].noun();
const metricUnit = (metric: BodyMetricKind) => METRIC_TEXT[metric].unit();

const valueText = (value: number) =>
  formatNumber(value, { maxFractionDigits: 1 });

/** Mốc thời gian → giá trị của ô `datetime-local` theo giờ máy ("2026-11-18T07:10"). */
function toLocalInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/** Giá trị ô `datetime-local` (giờ máy) → ISO; ô rỗng thì `fallback`. */
function fromLocalInput(value: string, fallback: Date): string {
  const date = value ? new Date(value) : fallback;
  return (Number.isNaN(date.getTime()) ? fallback : date).toISOString();
}

/** Lỗi của số user gõ, hoặc `null` khi hợp lệ (prototype progress › checkBody). */
function valueError(metric: BodyMetricKind, value: number | null) {
  if (value === null) return m.body_value_required();
  if (!isBodyMetricValueValid(metric, value)) {
    return m.body_value_out_of_range({
      name: metricNoun(metric),
      unit: metricUnit(metric),
    });
  }
  return null;
}

/**
 * Progress › Body (prototypes/progress, UC18): cân nặng, vòng eo, body fat nhập tay. Chỉ số
 * lưu trên server, đọc và ghi đều cần mạng (ADR 0002).
 */
export function BodyPage() {
  const body = useBodyMetrics();
  const { state, retry } = body;
  return (
    <RootScreen title={m.nav_progress()} banner={<ProgressTabs />}>
      {state.status === 'offline' && (
        <NoticeBib
          title={m.body_offline_title()}
          action={
            <Button variant="ink" onClick={retry}>
              {m.common_retry()}
            </Button>
          }
        >
          {m.body_offline_body()}
        </NoticeBib>
      )}
      {state.status === 'error' && (
        <>
          <Alert
            icon={<AlertIcon className="size-5" aria-hidden />}
            title={m.body_error_title()}
          >
            {m.error_unknown()}
          </Alert>
          <Button variant="ink" className="w-full" onClick={retry}>
            {m.common_retry()}
          </Button>
        </>
      )}
      {state.status === 'ready' && (
        <Measurements entries={state.entries} actions={body} />
      )}
    </RootScreen>
  );
}

type Actions = Pick<
  ReturnType<typeof useBodyMetrics>,
  'add' | 'update' | 'remove'
>;

function Measurements({
  entries,
  actions,
}: {
  entries: BodyMetric[];
  actions: Actions;
}) {
  const [metric, setMetric] = React.useState<BodyMetricKind>('weight');
  const [editing, setEditing] = React.useState<BodyMetric>();
  const list = entries.filter((e) => e.metric === metric);
  const toast = useToast();

  async function remove(entry: BodyMetric) {
    setEditing(undefined);
    if (!(await actions.remove(entry.id))) return;
    const date = formatShortDate(new Date(entry.measuredAt));
    toast.show(
      m.body_deleted({
        value: valueText(entry.value),
        unit: metricUnit(entry.metric),
        date,
      }),
      {
        durationMs: 5000,
        action: {
          label: m.common_undo(),
          onClick: () => {
            toast.hide();
            void actions.add({
              metric: entry.metric,
              value: entry.value,
              measuredAt: entry.measuredAt,
            });
          },
        },
      },
    );
  }

  return (
    <>
      <Segmented
        aria-label={m.body_metric_label()}
        value={metric}
        onValueChange={setMetric}
        options={BODY_METRICS.map((k) => ({
          value: k,
          label: metricName(k),
        }))}
      />
      <MetricChart metric={metric} list={list} />
      {/* key: đổi chỉ số thì bỏ số đang gõ và lỗi (prototype đặt lại S.err). */}
      <NewEntry
        key={metric}
        metric={metric}
        latest={list[0]}
        add={actions.add}
      />
      <Entries metric={metric} list={list} onEdit={setEditing} />
      {editing && (
        <EditSheet
          key={editing.id}
          entry={editing}
          onClose={() => setEditing(undefined)}
          update={actions.update}
          onDelete={() => void remove(editing)}
        />
      )}
    </>
  );
}

function MetricChart({
  metric,
  list,
}: {
  metric: BodyMetricKind;
  list: BodyMetric[];
}) {
  const name = metricName(metric);
  const unit = metricUnit(metric);
  const latest = list.at(0);
  // Cũ tới mới cho trục thời gian.
  const points = [...list].reverse().map((e) => ({
    x: formatShortDate(new Date(e.measuredAt)),
    y: e.value,
    label: `${valueText(e.value)} ${unit}`,
    dot: list.length < DOT_BELOW,
  }));
  return (
    <section className="overflow-hidden rounded-md bg-tyvek">
      {/* #36: dòng "Goal: 72 kg by Dec 31" dưới tiêu đề Weight khi có mục tiêu body_metric. */}
      <BlockHeading
        title={name}
        value={latest ? valueText(latest.value) : undefined}
      />
      {list.length > 1 ? (
        <Chart
          key={metric}
          kind="line"
          points={points}
          title={name}
          xHead={m.progress_axis_date()}
          yHead={m.body_axis({ name, unit })}
          yFormat={valueText}
          empty=""
        />
      ) : (
        <div className="px-4 py-7 text-center">
          <p>
            {list.length
              ? m.body_one_entry()
              : m.body_no_entries({ name: metricNoun(metric) })}
          </p>
        </div>
      )}
    </section>
  );
}

function NewEntry({
  metric,
  latest,
  add,
}: {
  metric: BodyMetricKind;
  latest?: BodyMetric;
  add: Actions['add'];
}) {
  const id = React.useId();
  const toast = useToast();
  const [text, setText] = React.useState('');
  const [measured, setMeasured] = React.useState(() =>
    toLocalInput(new Date()),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const unit = metricUnit(metric);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseDecimal(text);
    const problem = valueError(metric, value);
    setError(problem);
    if (problem || value === null) {
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    const saved = await add({
      metric,
      value,
      measuredAt: fromLocalInput(measured, new Date()),
    });
    setBusy(false);
    if (!saved) return;
    setText('');
    setMeasured(toLocalInput(new Date()));
    toast.show(m.body_saved({ value: valueText(value), unit }));
  }

  return (
    <Block pad>
      <form
        className="grid grid-cols-[1fr_auto] items-end gap-2"
        noValidate
        onSubmit={submit}
      >
        <div>
          <label htmlFor={id} className="mb-2 block label-caps">
            {m.body_new_entry({ unit })}
          </label>
          <Input
            ref={inputRef}
            id={id}
            inputMode="decimal"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={latest ? valueText(latest.value) : '–'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-14 text-num leading-none font-extrabold numeral"
          />
        </div>
        <Button type="submit" variant="ink" busy={busy} className="h-14 px-5">
          {m.common_save()}
        </Button>
      </form>
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-label font-bold text-danger"
        >
          {error}
        </p>
      )}
      <Field label={m.body_measured()} className="border-t-0 pb-0">
        <TextInput
          type="datetime-local"
          value={measured}
          onChange={(e) => setMeasured(e.target.value)}
        />
      </Field>
    </Block>
  );
}

function Entries({
  metric,
  list,
  onEdit,
}: {
  metric: BodyMetricKind;
  list: BodyMetric[];
  onEdit: (entry: BodyMetric) => void;
}) {
  const unit = metricUnit(metric);
  return (
    <section aria-label={m.body_entries()} className="flex flex-col">
      <SectionHeading>{m.body_entries()}</SectionHeading>
      <Block>
        {list.length ? (
          list.slice(0, LIST_LIMIT).map((e) => {
            const at = new Date(e.measuredAt);
            const date = formatShortDate(at);
            return (
              <Row asChild key={e.id}>
                <button
                  type="button"
                  aria-label={m.body_entry_label({
                    name: metricNoun(metric),
                    date,
                    value: valueText(e.value),
                    unit,
                  })}
                  onClick={() => onEdit(e)}
                >
                  <RowTitle
                    sub={`${formatTime(at)} · ${e.edited ? m.body_edited() : m.body_entered_by_hand()}`}
                  >
                    {date}
                  </RowTitle>
                  <RowValue>{valueText(e.value)}</RowValue>
                  <RowEnd chevron />
                </button>
              </Row>
            );
          })
        ) : (
          <Row>
            <RowTitle sub={m.body_nothing_yet_hint()}>
              {m.body_nothing_yet()}
            </RowTitle>
          </Row>
        )}
      </Block>
      {list.length > 0 && <Note className="mt-2">{m.body_tap_to_edit()}</Note>}
    </section>
  );
}

/**
 * Sửa một lần đo (prototype progress › editSheet): số và thời điểm; xoá nằm ở đây, một tầng
 * bên trong, kèm Hoàn tác (DESIGN.md › Xoá).
 */
function EditSheet({
  entry,
  onClose,
  update,
  onDelete,
}: {
  entry: BodyMetric;
  onClose: () => void;
  update: Actions['update'];
  onDelete: () => void;
}) {
  const formId = React.useId();
  const toast = useToast();
  const metric = entry.metric;
  const unit = metricUnit(metric);
  const at = new Date(entry.measuredAt);
  const [text, setText] = React.useState(
    formatNumber(entry.value, { maxFractionDigits: 2, grouping: false }),
  );
  const [measured, setMeasured] = React.useState(toLocalInput(at));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseDecimal(text);
    const problem = valueError(metric, value);
    setError(problem);
    if (problem || value === null) return;
    // Ô thời điểm chỉ tới phút: so theo chữ trong ô để mốc có giây không bị coi là đã sửa.
    const valueChanged = value !== entry.value;
    const timeChanged = measured !== toLocalInput(at);
    if (!valueChanged && !timeChanged) {
      onClose();
      return;
    }
    setBusy(true);
    const saved = await update(entry.id, {
      ...(valueChanged && { value }),
      ...(timeChanged && { measuredAt: fromLocalInput(measured, at) }),
    });
    setBusy(false);
    if (!saved) return;
    onClose();
    toast.show(m.body_updated({ value: valueText(value), unit }));
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>
            {m.body_edit_title({
              name: metricNoun(metric),
              date: formatShortDate(at),
            })}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form id={formId} noValidate onSubmit={submit}>
            <Field
              label={m.body_value_field({ name: metricName(metric), unit })}
              error={error}
              className="pt-0"
            >
              <TextInput
                data-autofocus
                inputMode="decimal"
                autoComplete="off"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-14 text-num leading-none font-extrabold numeral"
              />
            </Field>
            <Field label={m.body_measured()} className="border-t-0 pb-0">
              <TextInput
                type="datetime-local"
                value={measured}
                onChange={(e) => setMeasured(e.target.value)}
              />
            </Field>
          </form>
          <Block className="mt-4 bg-transparent">
            <Row asChild tone="danger" className="pl-0">
              <button type="button" onClick={onDelete}>
                <TrashIcon className="size-5 flex-none" aria-hidden />
                <RowTitle sub={m.body_delete_hint()}>
                  {m.body_delete()}
                </RowTitle>
              </button>
            </Row>
          </Block>
        </SheetBody>
        <SheetFooter>
          <Button
            type="submit"
            form={formId}
            variant="ink"
            size="wide"
            busy={busy}
          >
            {m.body_save_changes()}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
