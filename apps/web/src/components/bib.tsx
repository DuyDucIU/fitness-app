import * as React from 'react';

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
        open
          ? 'bg-tyvek shadow-[inset_0_0_0_2px_var(--color-ink)]'
          : 'bg-orange',
        className,
      )}
    >
      <span className="line-clamp-2 min-w-0 flex-1 label-caps">{children}</span>
      {action}
    </div>
  );
}

/**
 * Đường răng cưa tách mặt số áo với cuống vé (.perf): nét đứt kèm hai khuyết tròn màu nền
 * ở hai mép.
 */
export function BibPerf() {
  const notch = 'absolute top-0 size-4.5 rounded-full bg-ground';
  return (
    <div aria-hidden className="relative h-4.5">
      <i className="absolute inset-x-3.5 top-2 border-t-2 border-dashed border-rule" />
      <i className={cn(notch, '-left-2.25')} />
      <i className={cn(notch, '-right-2.25')} />
    </div>
  );
}

/**
 * Cuống vé dưới răng cưa (.stub): nhãn chữ hoa và số lớn bên trái, lời giải thích bên phải
 * trải hai hàng. Không có số thì nhãn nằm trên lời giải thích.
 */
export function BibStub({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div
      role="note"
      aria-labelledby={id}
      className={cn(
        'grid items-center gap-x-4 gap-y-1 px-4 pt-1 pb-4',
        value === undefined ? 'grid-cols-1' : 'grid-cols-[auto_1fr]',
      )}
    >
      <span id={id} className="label-caps">
        {label}
      </span>
      <p
        className={cn(
          'leading-[1.4]',
          value !== undefined && 'col-start-2 row-span-2 row-start-1',
        )}
      >
        {children}
      </p>
      {value !== undefined && (
        <b className="text-num leading-none numeral">{value}</b>
      )}
    </div>
  );
}
