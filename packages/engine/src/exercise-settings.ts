import { equipmentDefaults, type LoadInput } from './equipment';
import { roundToLadder } from './ladder';

/**
 * Cài đặt riêng từng bài (UC08, UC14; SDD 7.1 › USER_EXERCISE_SETTINGS). Hàm thuần: không
 * đọc đồng hồ, không gọi mạng.
 */

/** Cài đặt đang áp cho một bài: dòng user đã lưu, chưa lưu thì mặc định theo dụng cụ. */
export interface ExerciseSettings {
  /** Bậc tạ (kg) cho nút −/+ và ladder của gợi ý có số. */
  stepKg: number;
  /** Quy ước ghi tạ chụp vào bài trong buổi kế tiếp. */
  loadInput: LoadInput;
  /** Trọng lượng đòn (kg); `null` khi không có đòn. */
  barWeightKg: number | null;
  /** Tự chạy rest timer sau mỗi set (UC08); tắt thì timer chờ user bấm. */
  restAutoStart: boolean;
}

export function exerciseSettings(
  equipment: string | null,
  stored: ExerciseSettings | null,
): ExerciseSettings {
  if (stored) return stored;
  return { ...equipmentDefaults(equipment), restAutoStart: true };
}

/** Mức tạ thấp nhất nút − xuống tới: đòn khi ghi tổng tạ, còn lại 0 (như sàn back-off R3). */
export function weightFloor(
  s: Pick<ExerciseSettings, 'loadInput' | 'barWeightKg'>,
): number {
  return s.loadInput === 'total' ? (s.barWeightKg ?? 0) : 0;
}

/**
 * Mức tạ sau một lần bấm − (`-1`) hoặc + (`1`): bậc ladder kế tiếp theo hướng đó, nên mức
 * lệch ladder (kettlebell 10 kg, bậc 4) đi 8 hay 12 kg; không xuống dưới `weightFloor`. Ô
 * trống thì + bắt đầu từ đòn (ghi tổng tạ) hoặc một bậc. `null`: không bấm được (− ở sàn).
 */
export function stepWeight(
  value: number | null,
  direction: 1 | -1,
  s: Pick<ExerciseSettings, 'stepKg' | 'loadInput' | 'barWeightKg'>,
): number | null {
  const floor = weightFloor(s);
  if (value === null) {
    return direction === 1 ? Math.max(floor, s.stepKg) : null;
  }
  // Trừ sai số dấu phẩy động để mức nằm đúng trên ladder đi đúng một bậc.
  const ratio = value / s.stepKg;
  const rung =
    direction === 1
      ? Math.floor(ratio + 1e-9) + 1
      : Math.ceil(ratio - 1e-9) - 1;
  const next = Math.max(floor, roundToLadder(rung * s.stepKg, s.stepKg));
  if (direction === -1 && next >= value) return null;
  return next;
}

/** Các bậc tạ user chọn được trong cài đặt bài (SDD 7.2 › Mặc định theo dụng cụ). */
export const WEIGHT_STEPS = [0.5, 1, 1.25, 2, 2.5, 5, 10] as const;

/**
 * Các bậc tạ hiện trên ô chọn: `WEIGHT_STEPS`, chèn thêm bậc đang dùng nếu thiếu (vd 4 kg
 * mặc định của kettlebell) để luôn có một mức được chọn.
 */
export function stepChoices(current: number): number[] {
  const steps: number[] = [...WEIGHT_STEPS];
  if (!steps.includes(current)) steps.push(current);
  return steps.sort((a, b) => a - b);
}
