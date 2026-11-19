import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';

import { toggleVariants } from '@/components/ui/toggle';

/** Nhóm lựa chọn (segmented). Sinh bằng shadcn CLI rồi đơn giản hoá theo DESIGN.md. */
const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({ variant: 'default' });

function ToggleGroup({
  className,
  variant = 'default',
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      className={cn(
        'flex flex-wrap gap-1.5 data-[variant=stack]:flex-col data-[variant=stack]:flex-nowrap',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const { variant } = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleVariants({ variant }), className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
