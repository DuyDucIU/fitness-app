import * as React from 'react';
import { cn } from '@/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';

/**
 * Công tắc 52×32 (DESIGN.md): tắt nền `rule`, bật nền mực, nút gạt trắng.
 * Sinh bằng shadcn CLI rồi chỉnh kích thước và màu.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-8 w-13 shrink-0 items-center rounded-full transition-colors duration-200 outline-none data-checked:bg-ink data-unchecked:bg-rule data-disabled:cursor-not-allowed data-disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-6.5 rounded-full bg-on-signal transition-transform duration-200 ease-snap data-checked:translate-x-[23px] data-unchecked:translate-x-[3px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
