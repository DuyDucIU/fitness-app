import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Ghi chú 12px đậm vừa dưới khối, lề 4px (prototypes/shared/base.css › .note). */
export function Note({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('px-1 text-label leading-[1.4] font-semibold', className)}
      {...props}
    />
  );
}

/**
 * Khung chờ tải (prototypes/shared/base.css › .skel): khối `rule-soft` nhấp nháy.
 * Kích thước đặt qua className (vd `h-3.5 w-3/5`). Dùng thay cho chữ "Đang tải…".
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      className={cn('block animate-skel rounded-[6px] bg-rule-soft', className)}
      {...props}
    />
  );
}
