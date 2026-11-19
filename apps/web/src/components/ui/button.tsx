import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

/**
 * Nút theo DESIGN.md › Components. Sinh bằng shadcn CLI rồi đổi biến thể sang hệ "số áo":
 * - `ink` (mặc định): nền mực, chữ Trắng Tyvek — Lưu, Kết thúc, Thêm bài.
 * - `line`: viền mực 1.5px.
 * - `orange`: nền cam — hành động "đang diễn ra / bấm được".
 * - `danger`, `text`, `ghost`.
 * - Cỡ `go` (64px, chữ số áo viết hoa) cho nút chính ở vùng đáy; kết hợp với `orange` / `ink` / `line`.
 * - `busy`: đang chạy, hiện vòng quay sau nhãn và chặn bấm lại (.btn.busy).
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-bold whitespace-nowrap select-none active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        ink: 'bg-ink text-tyvek',
        line: 'shadow-[inset_0_0_0_1.5px_var(--color-ink)]',
        orange: 'bg-orange text-ink',
        danger: 'bg-danger text-on-signal',
        text: 'underline underline-offset-[3px]',
        ghost: 'active:bg-rule-soft',
      },
      size: {
        default: 'min-h-11 rounded-sm px-4 text-read',
        wide: 'min-h-11 w-full rounded-sm px-4 text-read',
        // .go: Barlow Condensed 800 chữ hoa, giãn chữ .01em, khoảng cách icon 10px, chữ dài thì cắt
        go: 'h-16 w-full min-w-0 gap-2.5 overflow-hidden rounded-lg px-3 font-numeral text-num leading-none font-extrabold text-ellipsis tracking-[0.01em] uppercase',
        icon: 'size-11 rounded-sm',
      },
    },
    compoundVariants: [
      {
        variant: 'line',
        size: 'go',
        className: 'shadow-[inset_0_0_0_2px_var(--color-ink)]',
      },
      { variant: 'text', size: 'default', className: 'px-2' },
    ],
    defaultVariants: {
      variant: 'ink',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'ink',
  size = 'default',
  asChild = false,
  busy = false,
  type = 'button',
  onClick,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    busy?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : type}
      aria-busy={busy || undefined}
      aria-disabled={busy || props['aria-disabled'] || undefined}
      onClick={(event) => {
        // pointer-events-none không chặn Enter/Space, nên chặn ở đây.
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        buttonVariants({ variant, size }),
        busy &&
          "pointer-events-none after:size-4 after:animate-[spin_0.7s_linear_infinite] after:rounded-full after:border-2 after:border-current after:border-r-transparent after:content-['']",
        className,
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };
