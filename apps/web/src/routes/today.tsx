import type { RoutineDay } from '@fitness/contract';
import { equipmentDefaults } from '@fitness/engine';
import * as React from 'react';
import { Link } from 'react-router';

import { exerciseNames } from '@/catalog/display';
import { useCatalog } from '@/catalog/use-catalog';
import { UpdateBanner } from '@/components/app-update';
import { Bib, BibBand, BibPerf, BibStub, BibTip } from '@/components/bib';
import { EmptyState } from '@/components/empty-state';
import { EditIcon, MoonIcon } from '@/components/icons';
import { OrderNo } from '@/components/text';
import { Button } from '@/components/ui/button';
import { useComingSoon } from '@/hooks/use-coming-soon';
import {
  formatLongDate,
  formatNumber,
  formatShortDate,
  formatWeekdayLetter,
} from '@/lib/format';
import { getLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { RootScreen } from '@/routes/root-screens';
import { targetText, workingSets } from '@/routines/display';
import {
  type ActiveRoutine,
  type DayLast,
  rotatedDays,
  useActiveRoutine,
} from '@/routines/rotation';
import { answerSuggestion, useOpenSession } from '@/workout/session';
import { tipText } from '@/workout/suggestion-text';
import { type DayTip, useDayTips } from '@/workout/suggestions';
import { useStartWorkout } from '@/workout/use-start-workout';
import { useThisWeek } from '@/workout/week';
import { WORKOUT_PATH } from '@/workout/workout-resume-bar';

/**
 * Today (prototypes/home, UC06): các ngày tập của routine đang dùng là các tấm số áo trên
 * một dải vuốt, ngày kế tiếp đứng đầu, tấm tập tự do đứng cuối; nút chính bắt đầu ngày
 * đang chọn. Có buổi đang dở thì nút chính thành tiếp tục buổi đó. Dải tuần đánh dấu ngày
 * đã tập; mục tiêu và streak (#36, #37) thuộc ticket riêng; lối vào deload (#30) báo
 * "Coming soon".
 */
export function TodayPage() {
  const open = useOpenSession();
  const routine = useActiveRoutine();
  const { start, starting } = useStartWorkout();
  const [current, setCurrent] = React.useState(0);
  const comingSoon = useComingSoon();

  const active = routine?.active ?? null;
  const days = active ? rotatedDays(active) : [];
  const chosen: RoutineDay | undefined = days[current];

  let dock: React.ReactNode = null;
  if (open) {
    dock = (
      <Button asChild variant="orange" size="go">
        <Link to={WORKOUT_PATH}>
          {m.home_resume_workout({
            name: open.day?.name ?? m.log_freestyle(),
          })}
        </Link>
      </Button>
    );
  } else if (open === null && routine) {
    dock = chosen ? (
      <Button
        variant={current === 0 ? 'orange' : 'ink'}
        size="go"
        busy={starting}
        onClick={() => start(chosen.id)}
      >
        {m.home_start_day({ name: chosen.name })}
      </Button>
    ) : (
      <Button
        variant="ink"
        size="go"
        busy={starting}
        onClick={() => start(null)}
      >
        {m.home_start_freestyle()}
      </Button>
    );
  }

  let body: React.ReactNode = null;
  if (active && days.length > 0) {
    body = (
      <>
        <DayWallet
          active={active}
          days={days}
          current={current}
          onCurrentChange={setCurrent}
        />
        {/* Deload thủ công: #30 (prototype › .side). */}
        <div className="px-1 pt-1 pb-4">
          <Button variant="text" className="min-h-11 px-0" onClick={comingSoon}>
            <MoonIcon aria-hidden />
            {m.home_plan_deload()}
          </Button>
        </div>
      </>
    );
  } else if (routine?.hasRoutines) {
    body = (
      <Bib>
        <BibBand open>{m.home_no_active()}</BibBand>
        <EmptyState
          stat={0}
          action={
            <Button asChild>
              <Link to="/plans">{m.home_open_plans()}</Link>
            </Button>
          }
        >
          {m.home_no_active_body()}
        </EmptyState>
      </Bib>
    );
  } else if (routine) {
    body = (
      <Bib>
        <BibBand open>{m.home_no_routine()}</BibBand>
        <EmptyState
          stat={0}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/plans/new">
                  <EditIcon aria-hidden />
                  {m.plans_write_routine()}
                </Link>
              </Button>
              {/* #16 */}
              <Button variant="line" onClick={comingSoon}>
                {m.plans_browse_programs()}
              </Button>
            </div>
          }
        >
          {m.home_no_routine_body()}
        </EmptyState>
      </Bib>
    );
  }

  return (
    <RootScreen
      title={m.nav_today()}
      sub={formatLongDate(new Date())}
      banner={<UpdateBanner workoutInProgress={!!open} />}
      dock={dock}
    >
      {routine && <WeekStrip />}
      {body}
    </RootScreen>
  );
}

/**
 * Dải tuần (prototype › .week): bảy ô thứ Hai → Chủ nhật, ô đã tập tô mực, hôm nay viền
 * cam. Bấm mở mục tiêu (#36); số buổi trên mục tiêu và streak bên phải thuộc #37.
 */
function WeekStrip() {
  const today = new Date();
  const week = useThisWeek(today);
  const comingSoon = useComingSoon();
  if (!week) return null;
  return (
    // #36: màn mục tiêu chưa có.
    <button
      type="button"
      aria-label={m.home_week_label({ count: week.count })}
      onClick={comingSoon}
      className="flex w-full items-center gap-3 px-1 pt-1 pb-3"
    >
      <span aria-hidden className="flex gap-1.25">
        {week.days.map((day) => (
          <b
            key={day.date.toISOString()}
            className={cn(
              'grid h-9.5 w-8 place-items-center rounded-sm border-[1.5px] border-rule text-label font-bold',
              day.trained && 'border-ink bg-ink text-tyvek',
              day.today &&
                (day.trained
                  ? 'border-orange shadow-[inset_0_0_0_2px_var(--color-orange)]'
                  : 'border-orange shadow-[inset_0_0_0_1.5px_var(--color-orange)]'),
            )}
          >
            {formatWeekdayLetter(day.date)}
          </b>
        ))}
      </span>
    </button>
  );
}

/**
 * Dải vuốt các ngày tập (prototype › .wallet, .pager): mỗi tấm bắt dính vào giữa, tấm đang
 * chọn rõ hơn các tấm bên cạnh. Hàng chấm phía trên chọn ngày bằng một chạm (và cho trình
 * đọc màn hình); vuốt dải thì chấm theo.
 */
function DayWallet({
  active,
  days,
  current,
  onCurrentChange,
}: {
  active: ActiveRoutine;
  days: RoutineDay[];
  current: number;
  onCurrentChange: (index: number) => void;
}) {
  const wallet = React.useRef<HTMLDivElement>(null);
  const settle = React.useRef<number>(undefined);
  React.useEffect(() => () => window.clearTimeout(settle.current), []);

  const pages = [...days.map((d) => d.name), m.log_freestyle()];

  function scrollTo(index: number) {
    onCurrentChange(index);
    const el = wallet.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollTo?.({
      left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  // Vuốt xong (cuộn đứng yên 90ms) thì tấm gần giữa nhất là tấm đang chọn.
  function onScroll() {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = wallet.current;
      if (!el) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      const cards = [...el.children] as HTMLElement[];
      const distance = (c: HTMLElement) =>
        Math.abs(c.offsetLeft + c.clientWidth / 2 - center);
      const nearest = cards.reduce(
        (best, c, i) => (distance(c) < distance(cards[best]) ? i : best),
        0,
      );
      if (nearest !== current) onCurrentChange(nearest);
    }, 90);
  }

  return (
    <div className="-mx-3">
      <div
        role="tablist"
        aria-label={m.home_choose_day()}
        className="-mt-1 flex justify-center gap-1.5 pb-1.5"
      >
        {pages.map((name, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={name}
            className="grid size-6 place-items-center"
            onClick={() => scrollTo(i)}
          >
            <i
              className={cn(
                'block h-1.5 rounded-full transition-[width,background-color] duration-200',
                i === current ? 'w-3.5 bg-ink' : 'w-1.5 bg-rule',
              )}
            />
          </button>
        ))}
      </div>
      <div
        ref={wallet}
        aria-label={m.home_days_label()}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory scroll-px-7 gap-2.5 overflow-x-auto overscroll-x-contain px-7 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day, i) => (
          <DayBib
            key={day.id}
            day={day}
            no={active.routine.days.indexOf(day) + 1}
            next={i === 0}
            last={active.lastByDay.get(day.id)}
            current={i === current}
          />
        ))}
        <Slide label={m.log_freestyle()} current={current === days.length}>
          <BibBand open>{m.log_freestyle()}</BibBand>
          <EmptyState stat={0}>{m.home_freestyle_body()}</EmptyState>
        </Slide>
      </div>
    </div>
  );
}

/** Một tấm trên dải vuốt: rộng gần bằng dải, bắt dính vào giữa. */
function Slide({
  label,
  current,
  children,
}: {
  label: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Bib
      aria-label={label}
      aria-roledescription="slide"
      className={cn(
        'w-[calc(100%-4px)] flex-none snap-center self-start transition-opacity duration-200',
        !current && 'opacity-82',
      )}
    >
      {children}
    </Bib>
  );
}

/**
 * Tấm số áo của một ngày tập (prototype › bibHTML): dải tên (cam với ngày kế tiếp) và số
 * thứ tự ngày, danh sách bài kèm target, số working set và lần tập gần nhất, rồi cuống
 * "trước khi tập": các gợi ý trước buổi chưa trả lời (UC12) thay cho câu chữ tĩnh.
 */
function DayBib({
  day,
  no,
  next,
  last,
  current,
}: {
  day: RoutineDay;
  /** Số thứ tự của ngày trong routine (từ 1). */
  no: number;
  next: boolean;
  last: DayLast | undefined;
  current: boolean;
}) {
  const catalog = useCatalog();
  const byId = React.useMemo(
    () => new Map((catalog ?? []).map((e) => [e.id, e])),
    [catalog],
  );
  const locale = getLocale();
  const exercises = [...day.exercises].sort((a, b) => a.position - b.position);
  const sets = workingSets(exercises);
  const tips = useDayTips(day);

  return (
    <Slide
      label={next ? m.home_next_up_label({ name: day.name }) : day.name}
      current={current}
    >
      <BibBand
        open={!next}
        action={
          <b className="pr-3 text-num leading-none whitespace-nowrap numeral">
            <small className="mr-1.5 align-[0.4em] font-sans label-caps">
              {m.home_day_no()}
            </small>
            {no}
          </b>
        }
      >
        {next ? m.home_next_up_band({ name: day.name }) : day.name}
      </BibBand>
      <ul className="pt-1.5 pb-2.5">
        {exercises.map((row, i) => {
          const exercise = byId.get(row.exerciseId);
          return (
            <li
              key={row.id}
              className="flex min-h-10 items-baseline gap-3 border-t border-rule-soft px-4 pt-2 pb-1.5 first:border-t-0"
            >
              <OrderNo n={i + 1} className="w-4.5" />
              <span className="min-w-0 flex-1 leading-[1.3] font-semibold">
                {exercise ? exerciseNames(exercise, locale).name : '…'}
              </span>
              <span className="text-label font-bold tracking-[0.06em] whitespace-nowrap">
                {targetText(row)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-baseline gap-x-4 px-4 pb-3 text-label font-semibold">
        <span>
          <b className="font-numeral text-read font-extrabold">{sets}</b>{' '}
          {m.home_working_sets_unit({ count: sets })}
        </span>
        <span>
          {last ? (
            <>
              {m.home_last()}{' '}
              <b className="font-numeral text-read font-extrabold">
                {formatShortDate(new Date(last.startedAt))}
              </b>{' '}
              · {m.home_minutes({ minutes: formatNumber(last.minutes) })}
            </>
          ) : (
            m.home_not_done()
          )}
        </span>
      </div>
      <BibPerf />
      {tips === undefined ? null : tips.length > 0 ? (
        tips.map((tip) => <DayTipNote key={tip.target.id} tip={tip} />)
      ) : (
        <BibStub label={m.home_before_start()}>
          {last ? m.home_before_start_repeat() : m.home_before_start_first()}
        </BibStub>
      )}
    </Slide>
  );
}

/**
 * Một gợi ý trước buổi trên tấm ngày tập (prototypes/home › tipHTML): tên bài in đậm, lời
 * gợi ý, lý do; "Got it" ghi `accepted` qua outbox, chạy cả khi offline.
 */
function DayTipNote({ tip }: { tip: DayTip }) {
  const metric = tip.exercise?.metricType ?? 'weight_reps';
  const loadInput = equipmentDefaults(
    tip.exercise?.equipment ?? null,
  ).loadInput;
  const { text, why } = tipText(tip.suggestion, metric, loadInput, true);
  const name = tip.exercise
    ? exerciseNames(tip.exercise, getLocale()).name
    : '…';
  return (
    <BibTip
      why={why}
      actions={
        <Button
          variant="ink"
          onClick={() => void answerSuggestion(tip, 'accepted')}
        >
          {m.sug_got_it()}
        </Button>
      }
    >
      <b>{name}:</b> {text}
    </BibTip>
  );
}
