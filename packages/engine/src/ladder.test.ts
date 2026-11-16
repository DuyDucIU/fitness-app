import { describe, expect, it } from 'vitest';
import { roundToLadder } from './ladder';

describe('roundToLadder', () => {
  it('làm tròn về bậc gần nhất', () => {
    expect(roundToLadder(51, 2.5)).toBe(50);
    expect(roundToLadder(52, 2.5)).toBe(52.5);
  });

  it('cách đều hai bậc thì làm tròn xuống', () => {
    expect(roundToLadder(51.25, 2.5)).toBe(50);
    expect(roundToLadder(2.5, 5)).toBe(0);
  });

  it('giữ nguyên khi đã nằm đúng bậc', () => {
    expect(roundToLadder(60, 2.5)).toBe(60);
  });

  it('không để lại sai số dấu phẩy động', () => {
    expect(roundToLadder(0.31, 0.1)).toBe(0.3);
  });

  it('từ chối step không hợp lệ', () => {
    expect(() => roundToLadder(10, 0)).toThrow(RangeError);
    expect(() => roundToLadder(Number.NaN, 5)).toThrow(RangeError);
  });
});
