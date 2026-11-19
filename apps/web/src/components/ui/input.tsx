import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Ô nhập (prototypes/shared/base.css › .in): cao 48px, viền mực 1.5px, nền trắng;
 * focus dày viền, `aria-invalid` viền đỏ. Sinh bằng shadcn CLI rồi đổi style.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-sm border-[1.5px] border-ink bg-white px-3 text-read outline-none placeholder:text-[#6b6b66] focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger)]',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
