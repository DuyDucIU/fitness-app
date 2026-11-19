import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Chip lọc / lựa chọn (prototypes/shared/base.css › .chip). The Mực Là Chọn Rule:
 * `pressed` = nền mực; `current` = viền cam ("hiện tại / hôm nay", không phải lựa chọn);
 * `dashed` = nhóm hoặc mở ("Cả buổi").
 */
export function Chip({
  pressed,
  current,
  dashed,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'aria-pressed'> & {
  pressed?: boolean;
  current?: boolean;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'flex h-11 flex-none items-center gap-2 rounded-sm border-[1.5px] border-rule bg-tyvek px-3 font-semibold whitespace-nowrap',
        current &&
          'border-orange shadow-[inset_0_0_0_1.5px_var(--color-orange)]',
        dashed && 'border-dashed border-ink',
        pressed && 'border-ink bg-ink text-tyvek shadow-none',
        className,
      )}
      {...props}
    />
  );
}

/** Dải chip cuộn ngang, ẩn thanh cuộn. */
export function ChipRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  );
}
