import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Tấm số áo (prototypes/shared/base.css › .bib): khối Trắng Tyvek bo 10px, cắt mọi thứ bên
 * trong theo góc bo. Mở đầu bằng `BibBand`.
 */
export function Bib({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('overflow-hidden rounded-md bg-tyvek', className)}
      {...props}
    />
  );
}

/**
 * Dải đầu của tấm số áo (.band): tên chữ hoa 12px, tối đa hai dòng, phần cuối bên phải
 * (`action`). Dải giữ góc vuông: góc trên do `Bib` bo và cắt, nên viền ở hai góc mỏng lại
 * như prototype. Mặc định nền cam (đang diễn ra); `open` là viền mực 2px trên nền Trắng
 * Tyvek (.band.open), vd "No routine yet", routine đang dùng.
 */
export function BibBand({
  open,
  action,
  className,
  children,
}: {
  open?: boolean;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-h-14 items-center gap-2.5 py-1.5 pr-1 pl-4 text-ink',
        open ? 'bg-tyvek shadow-[inset_0_0_0_2px_var(--color-ink)]' : 'bg-orange',
        className,
      )}
    >
      <span className="line-clamp-2 min-w-0 flex-1 label-caps">{children}</span>
      {action}
    </div>
  );
}
