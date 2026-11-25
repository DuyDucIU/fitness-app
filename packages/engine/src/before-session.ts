import type { LastTime, PastSet } from './last-time';

/**
 * Gợi ý trước buổi (UC12; SRS Phụ lục A: R1, R2, R4). Hàm thuần: không đọc đồng hồ (nhận
 * `today`), không gọi mạng; input lấy từ dữ liệu trên máy.
 */

/** Cách đo của bài (EXERCISES.metric_type). */
export type Metric = 'weight_reps' | 'reps' | 'duration' | 'distance';

/** Target của bài, cùng tên trường với bài trong ngày tập. */
export interface Target {
  repMin: number | null;
  repMax: number | null;
  targetDurationMinS: number | null;
  targetDurationMaxS: number | null;
}

/** Một lần tập đã ghi của bài, kèm target của bài trong ngày tập lúc đó (`null`: ad hoc). */
export interface PastSession extends LastTime {
  target: Target | null;
}

export interface BeforeSessionInput {
  /** Ngày hôm nay (YYYY-MM-DD); luật quay lại sau nghỉ (R6) tính khoảng nghỉ theo ngày này. */
  today: string;
  metric: Metric;
  /** Target của bài trong ngày tập; `null` với bài ad hoc. */
  target: Target | null;
  /** Các lần tập đã ghi của bài, mới nhất trước. */
  history: PastSession[];
}

/** Gợi ý có nút trả lời; chỉ nêu hướng tăng, không kèm mức tạ (R1). */
export interface PreSessionSuggestion {
  /** `increase`: R1; `celebrate`: R2. */
  kind: 'increase' | 'celebrate';
  reason: 'all_sets_top' | 'top_again';
  /**
   * Số set của lần trước và rep range (hoặc thời gian, giây) đã đạt trần; `min` là `null`
   * khi target không có đầu dưới.
   */
  params: { sets: number; min: number | null; top: number };
}

/** Câu nhắc ngắn cạnh số liệu lần trước. */
export type PreSessionHint =
  | { code: 'topped_out'; top: number }
  /** R4: các set lần trước khác mức tạ; điền sẵn đúng từng set, không gợi ý lên mức mới. */
  | { code: 'transition' }
  | { code: 'one_short'; sets: number; top: number }
  | { code: 'build_to_top'; top: number; weight: number | null };

export interface BeforeSession {
  suggestion: PreSessionSuggestion | null;
  hint: PreSessionHint | null;
}

const NOTHING: BeforeSession = { suggestion: null, hint: null };

/** Đầu dưới và trần mà luật so sánh, theo cách đo của bài. */
function bounds(metric: Metric, target: Target | null) {
  if (!target) return null;
  const [min, top] =
    metric === 'duration'
      ? [target.targetDurationMinS, target.targetDurationMaxS]
      : [target.repMin, target.repMax];
  return top === null ? null : { min, top };
}

/**
 * Rep range (hoặc thời gian) mà luật so sánh: của target; bài ad hoc thì của lần gần nhất
 * có rep range (SRS Phụ lục A › trường hợp biên). `null`: không có, không chạy R1–R3.
 */
export function rangeFor(
  metric: Metric,
  target: Target | null,
  history: PastSession[],
): { min: number | null; top: number } | null {
  if (target) return bounds(metric, target);
  return (
    history.map((h) => bounds(metric, h.target)).find((b) => b !== null) ?? null
  );
}

const valueOf = (metric: Metric, set: PastSet) =>
  metric === 'duration' ? set.durationS : set.reps;

/** STABLE: mọi working set cùng một mức tạ (GLOSSARY SRS 1.3). Bài không tạ luôn STABLE. */
function isStable(metric: Metric, session: PastSession) {
  if (metric !== 'weight_reps') return true;
  const first = session.sets[0]?.weight;
  return session.sets.every((s) => s.weight === first);
}

function allTop(metric: Metric, session: PastSession, top: number) {
  return (
    session.sets.length > 0 &&
    session.sets.every((s) => (valueOf(metric, s) ?? -1) >= top)
  );
}

export function beforeSession(input: BeforeSessionInput): BeforeSession {
  const { metric, history } = input;
  const [last, previous] = history;
  if (!last || metric === 'distance') return NOTHING;
  const range = rangeFor(metric, input.target, history);
  if (!range) return NOTHING;
  const { min, top } = range;

  if (!isStable(metric, last)) {
    return { suggestion: null, hint: { code: 'transition' } };
  }

  if (!allTop(metric, last, top)) {
    const short = last.sets.filter(
      (s) => (valueOf(metric, s) ?? -1) < top,
    ).length;
    return {
      suggestion: null,
      hint:
        short === 1
          ? { code: 'one_short', sets: last.sets.length, top }
          : { code: 'build_to_top', top, weight: last.sets[0]?.weight ?? null },
    };
  }

  // R2: buổi trước cũng đạt trần ở đúng mức tạ đó, tức đã bỏ qua lần gợi ý trước.
  const again =
    !!previous &&
    previous.loadInput === last.loadInput &&
    isStable(metric, previous) &&
    previous.sets[0]?.weight === last.sets[0]?.weight &&
    allTop(metric, previous, top);
  return {
    suggestion: {
      kind: again ? 'celebrate' : 'increase',
      reason: again ? 'top_again' : 'all_sets_top',
      params: { sets: last.sets.length, min, top },
    },
    hint: { code: 'topped_out', top },
  };
}
