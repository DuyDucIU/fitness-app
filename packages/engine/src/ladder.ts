/**
 * Làm tròn `value` về bậc tạ (ladder) gần nhất, là bội số của `step`.
 * Nếu cách đều hai bậc thì làm tròn xuống (SRS Phụ lục B — Ladder).
 *
 * Hàm thuần: không đọc đồng hồ, không gọi mạng.
 */
export function roundToLadder(value: number, step: number): number {
  if (!Number.isFinite(value)) throw new RangeError('value must be finite');
  if (!(step > 0)) throw new RangeError('step must be > 0');

  const ratio = value / step;
  const lower = Math.floor(ratio);
  const rounded = ratio - lower > 0.5 ? lower + 1 : lower;
  // toFixed loại bỏ sai số dấu phẩy động (vd 0.1 * 3).
  return Number((rounded * step).toFixed(6));
}
