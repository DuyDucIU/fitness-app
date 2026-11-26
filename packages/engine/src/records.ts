import type { Metric } from './before-session';
import type { LoadInput } from './equipment';

/** Loại PR (SDD › PERSONAL_RECORDS.pr_type). */
export const PR_TYPES = [
  'e1rm',
  'weight_at_reps',
  'max_reps',
  'session_volume',
] as const;
export type PrType = (typeof PR_TYPES)[number];

/** Số liệu một working set dùng để so PR. */
export interface RecordSet {
  weight: number | null;
  reps: number | null;
}

/** Các working set của bài trong một buổi đã kết thúc, kèm quy ước ghi tạ của buổi đó. */
export interface RecordSession {
  loadInput: LoadInput;
  sets: RecordSet[];
}

export interface NewRecordsInput {
  metric: Metric;
  /** Quy ước ghi tạ của bài trong buổi này; chỉ so với lịch sử cùng quy ước (D15). */
  loadInput: LoadInput;
  /** Mọi buổi đã kết thúc trước đó có bài này, mọi quy ước ghi tạ. */
  history: RecordSession[];
  /** Các working set của bài ghi trước set này trong cùng buổi. */
  earlier: RecordSet[];
  /** Set vừa ghi. */
  set: RecordSet;
}

/** Một PR mới. `reps`: số reps của set (với `weight_at_reps` là N); `null` với `session_volume`. */
export interface NewRecord {
  type: PrType;
  /** e1RM (kg), tạ (kg), số reps, hay tổng volume của buổi. */
  value: number;
  reps: number | null;
}

/** e1RM theo Epley: `weight × (1 + reps / 30)` (SRS UC19). */
export function e1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** Bỏ sai số dấu phẩy động: hai e1RM bằng nhau về toán không được tính là vượt. */
const EPSILON = 1e-9;

/**
 * Số reps tối đa để e1RM còn ý nghĩa: quá mức này set thiên về sức bền, Epley ước lượng
 * kém (như Stronglifts, cũng trần 12). Set nhiều reps hơn không lập và không làm mốc PR e1RM.
 */
export const E1RM_MAX_REPS = 12;
const beats = (value: number, best: number) => value > best + EPSILON;

type Complete = { weight: number | null; reps: number };
const complete = (sets: RecordSet[]): Complete[] =>
  sets.filter((s): s is Complete => s.reps !== null && s.reps > 0);

/** Volume một bài trong một buổi: tổng tạ × reps (tạ × reps), tổng reps (bài reps). */
function volume(metric: Metric, sets: Complete[]): number {
  return sets.reduce(
    (sum, s) =>
      sum + (metric === 'weight_reps' ? (s.weight ?? 0) * s.reps : s.reps),
    0,
  );
}

/** PR theo set (SRS UC17, DESIGN.md › PR theo kiểu bài); `null` nếu set không vượt. */
function setRecord(
  metric: Metric,
  past: Complete[],
  set: Complete,
): NewRecord | null {
  if (metric === 'weight_reps') {
    if (set.weight === null || set.reps > E1RM_MAX_REPS) return null;
    const best = Math.max(
      0,
      ...past
        .filter((s) => s.reps <= E1RM_MAX_REPS)
        .map((s) => (s.weight === null ? 0 : e1rm(s.weight, s.reps))),
    );
    const value = e1rm(set.weight, set.reps);
    return beats(value, best) ? { type: 'e1rm', value, reps: set.reps } : null;
  }
  // Bài reps: có tạ đeo thêm thì "nặng nhất cho N reps" so với set có tạ đeo thêm và ít
  // nhất N reps; không tạ (BW) thì "nhiều reps nhất" so với các set BW.
  const weight = set.weight ?? 0;
  if (weight > 0) {
    const best = Math.max(
      0,
      ...past
        .filter((s) => (s.weight ?? 0) > 0 && s.reps >= set.reps)
        .map((s) => s.weight ?? 0),
    );
    return beats(weight, best)
      ? { type: 'weight_at_reps', value: weight, reps: set.reps }
      : null;
  }
  // Chưa có set BW nào thì chưa có gì để vượt (như lần đầu tập bài).
  const bodyweight = past.filter((s) => !s.weight).map((s) => s.reps);
  if (bodyweight.length === 0) return null;
  return set.reps > Math.max(...bodyweight)
    ? { type: 'max_reps', value: set.reps, reps: set.reps }
    : null;
}

/**
 * PR tạm mà set vừa ghi lập được (UC07 bước 5, UC17), PR theo set đứng trước
 * `session_volume`. Chỉ so trong cùng bài và cùng quy ước ghi tạ. Chưa có buổi nào trước
 * đó cùng quy ước thì chưa có gì để vượt, kể cả giữa các set của buổi đầu. Phải vượt hẳn
 * kỷ lục; bằng thì không tính. `session_volume` báo một lần, ở set đẩy tổng của buổi qua
 * buổi cao nhất trước đó. Bài bấm giờ, quãng đường chưa có loại PR.
 *
 * Hàm thuần: dùng chung cho PR tạm trên máy và PR chuẩn trên server (D7).
 */
export function newRecords(input: NewRecordsInput): NewRecord[] {
  const { metric } = input;
  if (metric !== 'weight_reps' && metric !== 'reps') return [];
  const [set] = complete([input.set]);
  if (!set) return [];
  const sessions = input.history
    .filter((h) => h.loadInput === input.loadInput)
    .map((h) => complete(h.sets))
    .filter((sets) => sets.length > 0);
  if (sessions.length === 0) return [];

  const earlier = complete(input.earlier);
  const records: NewRecord[] = [];
  const bySet = setRecord(metric, [...sessions.flat(), ...earlier], set);
  if (bySet) records.push(bySet);

  const best = Math.max(...sessions.map((s) => volume(metric, s)));
  const before = volume(metric, earlier);
  const after = before + volume(metric, [set]);
  if (!beats(before, best) && beats(after, best)) {
    records.push({ type: 'session_volume', value: after, reps: null });
  }
  return records;
}
