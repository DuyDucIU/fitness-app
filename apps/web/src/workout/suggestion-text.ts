import type { LoadInput, MetricType, Suggestion } from '@fitness/contract';
import type { PreSessionHint, PreSessionSuggestion } from '@fitness/engine';

import { formatElapsed, formatNumber } from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import { backOffParams } from '@/workout/suggestions';

/**
 * Câu chữ của gợi ý (UC12, UC13), dựng ở client từ mã lý do và tham số engine trả về,
 * theo ngôn ngữ đang dùng (prototypes/home › suggestionsFor, prototypes/workout-log › r1,
 * hintFor).
 */

/** Trần (hoặc đầu dưới) của target: số rep, hay thời gian dạng 1:00 với bài đo thời gian. */
function amount(metric: MetricType, value: number): string {
  return metric === 'duration'
    ? formatElapsed(value * 1000)
    : formatNumber(value);
}

function rangeText(metric: MetricType, min: number | null, top: number) {
  const max = amount(metric, top);
  return min === null ? max : `${amount(metric, min)}–${max}`;
}

/** Cách tăng: theo cách đo của bài và quy ước ghi tạ. */
function howText(metric: MetricType, loadInput: LoadInput, today: boolean) {
  if (metric === 'duration') return m.sug_how_time();
  if (metric === 'reps') return m.sug_how_reps();
  if (loadInput === 'added_weight') return m.sug_how_added_weight();
  return today ? m.sug_how_weight_today() : m.sug_how_weight();
}

export interface TipText {
  /** Câu gợi ý (trên Today, đứng sau tên bài). */
  text: string;
  /** Lý do, bằng ngôn ngữ của người tập. */
  why: string;
}

/**
 * Câu của một gợi ý có nút trả lời. `today`: câu đứng sau tên bài in đậm trên tấm ngày
 * tập; ngược lại là câu riêng trên màn ghi set, nơi tên bài đã ở dải đầu.
 */
export function tipText(
  { kind, params }: PreSessionSuggestion,
  metric: MetricType,
  loadInput: LoadInput,
  today: boolean,
): TipText {
  const top = amount(metric, params.top);
  const range = rangeText(metric, params.min, params.top);
  if (kind === 'celebrate') {
    return {
      text: m.sug_top_again({ top }),
      why: m.sug_why_top_again({ range }),
    };
  }
  const count = m.sug_count({ n: params.sets });
  const lead =
    metric === 'duration'
      ? today
        ? m.sug_all_time_top_after_name({ top })
        : m.sug_all_time_top({ top })
      : today
        ? m.sug_all_top_after_name({ count, top })
        : m.sug_all_top({ count, top });
  return {
    text: `${lead} ${howText(metric, loadInput, today)}`,
    why: m.sug_why_all_top({ range }),
  };
}

/** Câu nhắc ngắn cạnh số liệu lần trước; bài chỉ reps không nhắc mức tạ. */
export function hintText(hint: PreSessionHint, reps: boolean): string {
  switch (hint.code) {
    case 'topped_out':
      return m.hint_topped_out();
    case 'transition':
      return m.hint_transition();
    case 'one_short': {
      const args = {
        count: m.sug_count({ n: hint.sets }),
        top: formatNumber(hint.top),
      };
      return reps ? m.hint_one_short_reps(args) : m.hint_one_short_weight(args);
    }
    case 'build_to_top':
      return reps || hint.weight === null
        ? m.hint_build_reps({ top: formatNumber(hint.top) })
        : m.hint_build_weight({
            weight: formatNumber(hint.weight),
            top: formatNumber(hint.top),
          });
  }
}

/** Các phần câu của gợi ý back-off; mức tạ mới in đậm giữa `dropBefore` và `dropAfter`. */
export interface BackOffText {
  lead: string;
  dropBefore: string;
  dropAfter: string;
  /** Mức tạ vừa ghi và mức back-off, đã định dạng theo ngôn ngữ. */
  from: string;
  to: string;
}

/**
 * Câu của gợi ý back-off (UC13, R3; prototypes/workout-log › logSet, rpeBackoff) từ mã lý
 * do và tham số. `null` nếu bản ghi thiếu tham số.
 */
export function backOffText(s: Suggestion): BackOffText | null {
  const params = backOffParams(s);
  if (!params) return null;
  const { reps, min, from, to, sets } = params;
  const args = { reps: formatNumber(reps), min: formatNumber(min) };
  const allOut = s.reason === 'min_all_out';
  return {
    lead: allOut ? m.backoff_min_all_out(args) : m.backoff_under_min(args),
    dropBefore: m.backoff_drop_before(),
    dropAfter: allOut
      ? m.backoff_drop_after_all_out({ n: sets })
      : m.backoff_drop_after_under_min({ n: sets }),
    from: formatNumber(from),
    to: formatNumber(to),
  };
}
