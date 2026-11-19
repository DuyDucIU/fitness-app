import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Toggle as TogglePrimitive } from 'radix-ui';

/**
 * Nút chọn của nhóm lựa chọn (prototypes/shared/base.css › .seg). The Mực Là Chọn Rule:
 * đang chọn = nền mực chữ Trắng Tyvek; chưa chọn = nền Trắng Tyvek viền `rule`.
 * Sinh bằng shadcn CLI rồi đổi biến thể.
 */
const toggleVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm bg-tyvek font-semibold whitespace-nowrap shadow-[inset_0_0_0_1.5px_var(--color-rule)] outline-none disabled:pointer-events-none disabled:opacity-40 data-[state=on]:bg-ink data-[state=on]:text-tyvek data-[state=on]:shadow-[inset_0_0_0_1.5px_var(--color-ink)] [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'min-h-11 min-w-14 px-3',
        /** Lựa chọn xếp chồng có dòng phụ (.seg.stack). */
        stack:
          'min-h-14 w-full flex-col items-start justify-center gap-0 px-3.5 py-2 text-left leading-[1.3] whitespace-normal',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Toggle({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
