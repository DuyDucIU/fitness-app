import type * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

import { ChevronIcon } from '@/components/icons';

/** Khối Trắng Tyvek bo 10px chứa các hàng (prototypes/shared/base.css › .block). */
export function Block({
  pad,
  className,
  ...props
}: React.ComponentProps<'div'> & { pad?: boolean }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md bg-tyvek',
        pad && 'p-4',
        className,
      )}
      {...props}
    />
  );
}

const rowVariants = cva(
  'flex min-h-13 w-full items-center gap-3 border-t border-rule-soft py-2 pr-3 pl-4 text-left first:border-t-0',
  {
    variants: {
      tone: {
        default: '',
        /** Hàng "hiện tại" (viền cam dành cho hiện tại, nền cam nhạt). */
        current: 'bg-orange-tint',
        /** Hàng đảo nền mực (vd hàng PR). */
        inverse: 'bg-ink text-tyvek',
        danger: 'text-danger',
        /** Hàng "Thêm…" viền đứt, căn giữa. */
        add: 'justify-center gap-2 border-dashed border-rule font-bold',
      },
      interactive: {
        true: 'active:bg-rule-soft',
        false: '',
      },
    },
    defaultVariants: { tone: 'default', interactive: false },
  },
);

/**
 * Một hàng trong khối: tên + dòng phụ bên trái, giá trị số / phần cuối bên phải.
 * Dùng `asChild` để hàng là `<button>` hoặc `<Link>`.
 */
export function Row({
  asChild,
  tone,
  interactive,
  className,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof rowVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div';
  return (
    <Comp
      className={cn(
        rowVariants({ tone, interactive: interactive ?? asChild }),
        className,
      )}
      {...props}
    />
  );
}

/** Tên hàng (600) kèm dòng phụ 12px. */
export function RowTitle({
  sub,
  children,
}: {
  sub?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="min-w-0 flex-1 leading-[1.3] font-semibold">
      {children}
      {sub && (
        <small className="block text-label leading-[1.35] font-normal">
          {sub}
        </small>
      )}
    </span>
  );
}

/** Giá trị số 28px (Barlow Condensed). */
export function RowValue({ children }: { children: React.ReactNode }) {
  return (
    <b className="text-num leading-none whitespace-nowrap numeral">
      {children}
    </b>
  );
}

/** Phần cuối hàng: nhãn 12px chữ hoa căn phải, tuỳ chọn mũi tên đi sâu. */
export function RowEnd({
  chevron,
  children,
}: {
  chevron?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className="ml-auto flex flex-none items-center gap-2 text-right text-label font-bold tracking-[0.06em] uppercase">
      {children}
      {chevron && <ChevronIcon className="-mr-1 size-5" aria-hidden />}
    </span>
  );
}
