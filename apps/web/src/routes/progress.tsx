import {
  type E1rmSeries,
  MUSCLE_GROUPS,
  type MuscleGroup,
  type ProgressResponse,
  type ProgressWeek,
} from '@fitness/contract';
import * as React from 'react';
import { Link } from 'react-router';

import { exerciseNames } from '@/catalog/display';
import { useCatalog } from '@/catalog/use-catalog';
import { Row, RowEnd, RowTitle } from '@/components/block';
import { Chart } from '@/components/chart';
import { Segmented, Subtabs } from '@/components/controls';
import { Alert, EmptyState } from '@/components/empty-state';
import { Select } from '@/components/field';
import { AlertIcon, BackIcon, ChevronIcon, PlayIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useComingSoon } from '@/hooks/use-coming-soon';
import {
  formatMonthShort,
  formatMonthYear,
  formatNumber,
  formatShortDate,
  fromLocalDate,
} from '@/lib/format';
import { getLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { useProgress } from '@/progress/use-progress';
import { RootScreen } from '@/routes/root-screens';
import { loadLabel } from '@/workout/display';

/** Số tuần trước tuần đang xem dùng để tính trung bình (prototype progress). */
const AVERAGE_WEEKS = 4;

type Range = '4' | '12';

function muscleGroupName(group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return m.muscle_group_chest();
    case 'back':
      return m.muscle_group_back();
    case 'shoulders':
      return m.muscle_group_shoulders();
    case 'arms':
      return m.muscle_group_arms();
    case 'legs':
      return m.muscle_group_legs();
    case 'core':
      return m.muscle_group_core();
    case 'neck':
      return m.muscle_group_neck();
  }
}

/** Training | Body. Màn chỉ số cơ thể làm ở #35, tới lúc đó báo "Coming soon". */
function ProgressTabs() {
  const comingSoon = useComingSoon();
  return (
    <Subtabs
      aria-label={m.progress_tabs_label()}
      items={[
        { to: '/progress', label: m.progress_tab_training() },
        // #35
        { onClick: comingSoon, label: m.progress_tab_body() },
      ]}
    />
  );
}

/** Khối kiểu số áo có dải viền rỗng và câu ở giữa: chưa có dữ liệu, hay cần mạng. */
function NoticeBib({
  title,
  children,
  stat,
  action,
}: {
  title: string;
  children: React.ReactNode;
  stat?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md bg-tyvek">
      <h2 className="flex min-h-14 items-center px-4 py-1.5 label-caps shadow-[inset_0_0_0_2px_var(--color-ink)]">
        {title}
      </h2>
      <EmptyState stat={stat} action={action}>
        {children}
      </EmptyState>
    </section>
  );
}

/**
 * Progress › Training (prototypes/progress, UC19): working set mỗi tuần theo nhóm cơ, số
 * buổi theo tuần hoặc tháng, e1RM theo bài. Số liệu tổng hợp trên server nên cần mạng.
 */
export function ProgressPage() {
  const { state, retry } = useProgress();
  return (
    <RootScreen title={m.nav_progress()} banner={<ProgressTabs />}>
      {state.status === 'offline' && (
        <NoticeBib
          title={m.progress_offline_title()}
          action={
            <Button variant="ink" onClick={retry}>
              {m.common_retry()}
            </Button>
          }
        >
          {m.progress_offline_body()}
        </NoticeBib>
      )}
      {state.status === 'error' && (
        <>
          <Alert
            icon={<AlertIcon className="size-5" aria-hidden />}
            title={m.progress_error_title()}
          >
            {m.error_unknown()}
          </Alert>
          <Button variant="ink" className="w-full" onClick={retry}>
            {m.common_retry()}
          </Button>
        </>
      )}
      {state.status === 'ready' &&
        (isEmpty(state.data) ? (
          <NoticeBib
            title={m.progress_empty_title()}
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
            {m.progress_empty_body()}
          </NoticeBib>
        ) : (
          <Training data={state.data} />
        ))}
    </RootScreen>
  );
}

function isEmpty(data: ProgressResponse): boolean {
  return (
    data.e1rm.length === 0 &&
    data.weeks.every((w) => w.workouts === 0) &&
    data.months.every((mo) => mo.workouts === 0)
  );
}

function Training({ data }: { data: ProgressResponse }) {
  const [range, setRange] = React.useState<Range>('12');
  const weeks = Number(range);
  // Tuần đầu của khoảng đang xem: e1RM chỉ vẽ các buổi từ tuần này.
  const firstWeek = data.weeks[Math.max(0, data.weeks.length - weeks)];
  return (
    <>
      <Segmented
        aria-label={m.progress_range_label()}
        value={range}
        onValueChange={setRange}
        options={[
          { value: '4', label: m.progress_range_4w() },
          { value: '12', label: m.progress_range_12w() },
        ]}
      />
      <MuscleSets key={range} weeks={data.weeks} range={weeks} />
      <Frequency data={data} range={weeks} />
      <E1rm series={data.e1rm} from={firstWeek.start} />
    </>
  );
}

/** Tiêu đề khối (.chd): tiêu đề 16px 700, dòng phụ 12px, số lớn tuỳ chọn bên phải. */
function BlockHeading({
  title,
  sub,
  value,
}: {
  title: string;
  sub: string;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-2 px-4 pt-3.5">
      <h2 className="flex-1 text-read leading-[1.3] font-bold">
        {title}
        <small className="block text-label font-semibold">{sub}</small>
      </h2>
      {value && <b className="text-num leading-none numeral">{value}</b>}
    </div>
  );
}

const setCount = (value: number) =>
  formatNumber(value, { maxFractionDigits: 1 });

function MuscleSets({
  weeks,
  range,
}: {
  weeks: ProgressWeek[];
  range: number;
}) {
  // Số tuần lùi lại từ tuần này: 0 = tuần này.
  const [back, setBack] = React.useState(0);
  const index = weeks.length - 1 - back;
  const week = weeks[index];
  const current = back === 0;
  const previous = weeks.slice(Math.max(0, index - AVERAGE_WEEKS), index);
  const average = (g: MuscleGroup) =>
    previous.length
      ? previous.reduce((sum, w) => sum + w.sets[g], 0) / previous.length
      : 0;
  const max = Math.max(
    1,
    ...MUSCLE_GROUPS.map((g) => Math.max(week.sets[g], average(g))),
  );
  const total = MUSCLE_GROUPS.reduce((sum, g) => sum + week.sets[g], 0);
  const weekLabel = current
    ? m.progress_this_week()
    : m.progress_week_of({ date: formatShortDate(fromLocalDate(week.start)) });

  return (
    <section className="overflow-hidden rounded-md bg-tyvek">
      <BlockHeading
        title={m.progress_sets_title()}
        sub={m.progress_sets_sub()}
      />
      <div className="mt-2 flex items-center gap-1 px-4">
        <button
          type="button"
          className="grid size-11 flex-none place-items-center rounded-sm active:bg-rule-soft disabled:opacity-40"
          aria-label={m.progress_previous_week()}
          disabled={back >= range - 1}
          onClick={() => setBack((b) => b + 1)}
        >
          <BackIcon className="size-5" aria-hidden />
        </button>
        <b className="flex-1 text-center font-bold">{weekLabel}</b>
        <button
          type="button"
          className="grid size-11 flex-none place-items-center rounded-sm active:bg-rule-soft disabled:opacity-40"
          aria-label={m.progress_next_week()}
          disabled={current}
          onClick={() => setBack((b) => b - 1)}
        >
          <ChevronIcon className="size-5" aria-hidden />
        </button>
      </div>
      <div
        role="table"
        aria-label={m.progress_sets_title()}
        className="px-4 pt-2 pb-1"
      >
        {MUSCLE_GROUPS.map((g) => {
          const now = week.sets[g];
          const avg = average(g);
          return (
            <div
              key={g}
              role="row"
              className="grid min-h-8 grid-cols-[96px_1fr_56px] items-center gap-2.5"
            >
              <span role="rowheader" className="text-read font-semibold">
                {muscleGroupName(g)}
              </span>
              <span
                role="cell"
                aria-label={m.progress_sets_cell({
                  sets: setCount(now),
                  average: setCount(avg),
                })}
                className="relative h-3"
              >
                <span
                  className="absolute inset-y-0 left-0 min-w-0.5 rounded-r-[4px] bg-ink transition-[width] duration-300"
                  style={{ width: `${(now / max) * 100}%` }}
                />
                {avg > 0 && (
                  <span
                    className="absolute -inset-y-[5px] -ml-px w-0.5 bg-ink"
                    style={{ left: `${(avg / max) * 100}%` }}
                  />
                )}
              </span>
              <span
                role="cell"
                className={cn(
                  'text-right font-numeral text-read [font-variant-numeric:tabular-nums]',
                  now ? 'font-extrabold' : 'font-semibold',
                )}
              >
                {setCount(now)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 px-4 pt-1.5 pb-3 text-label font-semibold">
        <span>
          <i
            aria-hidden
            className="mr-1.5 inline-block h-2.5 w-3.5 rounded-r-[3px] bg-ink align-middle"
          />
          {current
            ? m.progress_legend_this_week()
            : m.progress_legend_that_week()}
        </span>
        <span>
          <i
            aria-hidden
            className="mr-1.5 inline-block h-4 w-[3px] bg-ink align-middle"
          />
          {m.progress_legend_average()}
        </span>
      </div>
      {current && (
        <p className="px-4 pb-3 text-label leading-[1.4] font-semibold">
          {m.progress_sets_so_far({ sets: setCount(total) })}
        </p>
      )}
    </section>
  );
}

type Period = 'week' | 'month';

function Frequency({ data, range }: { data: ProgressResponse; range: number }) {
  const [period, setPeriod] = React.useState<Period>('week');
  // #36: dòng "Goal: N a week" và nhãn đạt/trượt mục tiêu từng tuần (prototype).
  // #30: tuần deload tô màu `rule`, ghi "deload week · streak paused".
  const points =
    period === 'week'
      ? data.weeks.slice(-range).map((w) => ({
          x: formatShortDate(fromLocalDate(w.start)),
          y: w.workouts,
          label: m.progress_workouts({ count: w.workouts }),
          short: formatNumber(w.workouts),
        }))
      : data.months.map((mo) => ({
          x: formatMonthShort(fromLocalDate(mo.start)),
          y: mo.workouts,
          label: m.progress_workouts({ count: mo.workouts }),
          short: formatNumber(mo.workouts),
        }));
  // Bảng ghi rõ tháng kèm năm; trục chỉ đủ chỗ cho tháng ngắn.
  const tablePoints =
    period === 'week'
      ? points
      : points.map((p, i) => ({
          ...p,
          x: formatMonthYear(fromLocalDate(data.months[i].start)),
        }));
  const title =
    period === 'week'
      ? m.progress_frequency_week_title()
      : m.progress_frequency_month_title();
  return (
    <section className="overflow-hidden rounded-md bg-tyvek">
      <BlockHeading
        title={title}
        sub={
          period === 'week'
            ? m.progress_frequency_week_sub()
            : m.progress_frequency_month_sub()
        }
      />
      <div className="px-4 pt-2.5">
        <Segmented
          aria-label={m.progress_period_label()}
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: 'week', label: m.progress_period_week() },
            { value: 'month', label: m.progress_period_month() },
          ]}
        />
      </div>
      <FrequencyChart
        points={points}
        tablePoints={tablePoints}
        title={title}
        xHead={
          period === 'week' ? m.progress_axis_week() : m.progress_axis_month()
        }
      />
    </section>
  );
}

/** Biểu đồ cột số buổi; bảng dùng nhãn đầy đủ hơn trục (tháng kèm năm). */
function FrequencyChart({
  points,
  tablePoints,
  title,
  xHead,
}: {
  points: React.ComponentProps<typeof Chart>['points'];
  tablePoints: React.ComponentProps<typeof Chart>['points'];
  title: string;
  xHead: string;
}) {
  return (
    <Chart
      kind="bar"
      zero
      height={160}
      points={points}
      tablePoints={tablePoints}
      title={title}
      xHead={xHead}
      yHead={m.progress_axis_workouts()}
      yFormat={(v) => formatNumber(v, { maxFractionDigits: 0 })}
      empty={m.progress_chart_empty()}
    />
  );
}

/** Một mục trong ô chọn bài: một bài với một cách ghi tạ. */
interface E1rmOption {
  key: string;
  name: string;
  label: string;
  series: E1rmSeries;
}

const seriesKey = (s: E1rmSeries) => `${s.exerciseId} ${s.loadInput}`;

function E1rm({ series, from }: { series: E1rmSeries[]; from: string }) {
  const comingSoon = useComingSoon();
  const catalog = useCatalog();
  const locale = getLocale();
  const options = React.useMemo<E1rmOption[]>(() => {
    const byId = new Map(catalog?.map((e) => [e.id, e]));
    const lines = series.filter((s) => s.points.length > 0);
    const count = (id: string) =>
      lines.filter((s) => s.exerciseId === id).length;
    const collator = new Intl.Collator(locale);
    return lines
      .map((s) => {
        const exercise = byId.get(s.exerciseId);
        const name = exercise
          ? exerciseNames(exercise, locale).name
          : m.log_unknown_exercise();
        return {
          key: seriesKey(s),
          name,
          label:
            count(s.exerciseId) > 1
              ? `${name} · ${loadLabel(s.loadInput)}`
              : name,
          series: s,
        };
      })
      .sort((a, b) => collator.compare(a.label, b.label));
  }, [series, catalog, locale]);

  // Mặc định: đường có buổi gần nhất.
  const latest = React.useMemo(
    () =>
      options.reduce<E1rmOption | undefined>(
        (best, o) =>
          !best ||
          (o.series.points.at(-1)?.date ?? '') >
            (best.series.points.at(-1)?.date ?? '')
            ? o
            : best,
        undefined,
      ),
    [options],
  );
  const [picked, setPicked] = React.useState<string>();
  const selected =
    options.find((o) => o.key === picked) ?? latest ?? options[0];

  const points = (selected?.series.points ?? [])
    .filter((p) => p.date >= from)
    .map((p) => ({
      x: formatShortDate(fromLocalDate(p.date)),
      y: p.e1rmKg,
      label: `${formatNumber(p.e1rmKg, { maxFractionDigits: 1 })} ${m.unit_kg()}`,
    }));
  const latestValue = points.at(-1)?.y;

  // Tên bài lấy từ catalog trên máy: chờ đọc xong để không hiện tên tạm.
  if (catalog === undefined) return null;
  return (
    <section className="overflow-hidden rounded-md bg-tyvek">
      <BlockHeading
        title={m.progress_e1rm_title()}
        sub={m.progress_e1rm_sub()}
        value={
          latestValue === undefined
            ? undefined
            : formatNumber(latestValue, { maxFractionDigits: 0 })
        }
      />
      {selected ? (
        <>
          <div className="flex gap-2 px-4 pt-2.5">
            <Select
              aria-label={m.progress_e1rm_exercise()}
              value={selected.key}
              onChange={(e) => setPicked(e.target.value)}
            >
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Chart
            key={selected.key}
            kind="line"
            points={points}
            title={m.progress_e1rm_chart_title({ name: selected.label })}
            xHead={m.progress_axis_date()}
            yHead={m.progress_axis_e1rm({ unit: m.unit_kg() })}
            yFormat={(v) => formatNumber(v, { maxFractionDigits: 0 })}
            empty={m.progress_e1rm_empty_range({ name: selected.name })}
          />
          {/* #33: lịch sử và PR của bài. */}
          <Row asChild className="border-t border-rule-soft first:border-t">
            <button type="button" onClick={comingSoon}>
              <RowTitle>
                {m.progress_all_records({ name: selected.name })}
              </RowTitle>
              <RowEnd chevron />
            </button>
          </Row>
        </>
      ) : (
        <div className="px-4 py-7 text-center">
          <p>{m.progress_e1rm_none()}</p>
        </div>
      )}
    </section>
  );
}
