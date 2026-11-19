import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn với token riêng', () => {
  it('cỡ chữ và màu chữ tuỳ biến không xoá nhau', () => {
    expect(cn('bg-ink text-tyvek', 'text-read')).toBe(
      'bg-ink text-tyvek text-read',
    );
    expect(cn('text-on-signal', 'text-num')).toBe('text-on-signal text-num');
  });

  it('vẫn gộp class cùng nhóm', () => {
    expect(cn('text-read', 'text-label')).toBe('text-label');
    expect(cn('text-ink', 'text-tyvek')).toBe('text-tyvek');
    expect(cn('bg-ink', 'bg-orange')).toBe('bg-orange');
    expect(cn('rounded-sm', 'rounded-sheet')).toBe('rounded-sheet');
  });
});
