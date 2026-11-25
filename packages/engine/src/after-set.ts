import {
  type Metric,
  type PastSession,
  rangeFor,
  type Target,
} from './before-session';
import type { LoadInput } from './equipment';
import { ENGINE_DEFAULTS } from './defaults';
import { roundToLadder } from './ladder';

/**
 * Gợi ý back-off trong buổi (UC13; SRS Phụ lục A: R3). Hàm thuần: không đọc đồng hồ, không
 * gọi mạng; input lấy từ dữ liệu trên máy.
 */

export interface AfterSetInput {
  metric: Metric;
  /** Target của bài trong ngày tập; `null` với bài ad hoc. */
  target: Target | null;
  /** Các lần tập đã ghi của bài, mới nhất trước; bài ad hoc lấy rep range từ đây. */
  history: PastSession[];
  /** Set working vừa ghi. */
  set: { weight: number | null; reps: number | null; rpe: number | null };
  /** Số working set còn chờ tập sau set này. */
  setsLeft: number;
  /** Quy ước ghi tạ của bài trong buổi. */
  loadInput: LoadInput;
  /** Bậc tạ (ladder) của bài. */
  stepKg: number;
  /** Trọng lượng đòn; chỉ là sàn của back-off khi ghi tổng tạ. */
  barWeightKg: number | null;
}

export interface BackOff {
  kind: 'back_off';
  /** `under_min`: dưới sàn rep range; `min_all_out`: đúng sàn với RPE cao. */
  reason: 'under_min' | 'min_all_out';
  /** Reps vừa ghi, sàn rep range, mức tạ vừa ghi, mức back-off và số set còn lại. */
  params: { reps: number; min: number; from: number; to: number; sets: number };
}

/** Bậc ladder (bội số của `step`) lớn nhất nhỏ hơn hẳn `value`. */
function ladderBelow(value: number, step: number): number {
  // Trừ sai số dấu phẩy động để mức nằm đúng trên ladder (vd 7.5 / 2.5) xuống đúng một bậc.
  const rung = Math.ceil(value / step - 1e-9) - 1;
  return roundToLadder(rung * step, step);
}

export function afterSet(input: AfterSetInput): BackOff | null {
  const { set, stepKg } = input;
  if (input.metric !== 'weight_reps' || input.setsLeft <= 0) return null;
  const min = rangeFor(input.metric, input.target, input.history)?.min;
  if (min == null || set.weight === null || set.reps === null) return null;
  // Dưới sàn; hoặc đúng sàn mà đã kiệt sức (chỉ khi set có RPE).
  const allOut =
    set.reps === min &&
    set.rpe !== null &&
    set.rpe >= ENGINE_DEFAULTS.backOffRpe;
  if (set.reps > min || (set.reps === min && !allOut)) return null;
  // max(W, current − step): W là đòn khi ghi tổng tạ, còn lại là 0. `current − step` là bậc
  // ladder ngay dưới mức hiện tại, để mức lệch ladder (kettlebell 10 kg, bậc 4) chỉ giảm một
  // bậc (8 kg) chứ không tụt hai bậc (4 kg).
  const floor = input.loadInput === 'total' ? (input.barWeightKg ?? 0) : 0;
  const to = Math.max(floor, ladderBelow(set.weight, stepKg));
  // Đã ở sàn thì không còn gì để giảm.
  if (to >= set.weight) return null;
  return {
    kind: 'back_off',
    reason: allOut ? 'min_all_out' : 'under_min',
    params: {
      reps: set.reps,
      min,
      from: set.weight,
      to,
      sets: input.setsLeft,
    },
  };
}
