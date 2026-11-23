import type * as React from 'react';

import { formatNumber } from '@/lib/format';
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
 * Số thứ tự cỡ số phụ 28px đầu hàng (prototypes › .dayrow .n, .exrow .n, home › .ex .n):
 * rộng 24px, căn giữa. Hàng hẹp hơn (danh sách bài trên tấm ngày ở Today, 18px) đổi độ
 * rộng qua className.
 */
export function OrderNo({ n, className }: { n: number; className?: string }) {
  return (
    <b
      className={cn(
        'w-6 flex-none text-center text-num leading-none numeral',
        className,
      )}
    >
      {formatNumber(n)}
    </b>
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
