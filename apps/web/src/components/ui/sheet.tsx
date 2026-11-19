import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';

/**
 * Bottom sheet theo DESIGN.md (prototypes/shared/base.css › .sheet). Sinh bằng shadcn CLI
 * (`sheet`, nền Radix Dialog) rồi chỉnh chỉ còn dạng trượt từ dưới lên trong cột 440px,
 * bo 16px hai góc trên, có tay nắm, lớp phủ mực 42%, không đổ bóng.
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-40 bg-ink/42 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed inset-x-0 bottom-0 z-41 mx-auto flex max-h-[88dvh] w-full max-w-[440px] flex-col rounded-t-sheet bg-tyvek pb-(--safe-bottom) text-ink outline-none ease-snap data-open:animate-in data-open:duration-300 data-open:slide-in-from-bottom data-closed:animate-out data-closed:duration-200 data-closed:slide-out-to-bottom',
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-rule"
        />
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-2"
            >
              <XIcon />
              <span className="sr-only">{m.common_close()}</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1 py-3 pr-14 pl-4', className)}
      {...props}
    />
  );
}

/** Thân sheet cuộn được; nội dung dài không đẩy tay nắm và nút đóng ra khỏi màn hình. */
function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('overflow-y-auto overscroll-contain px-4 pb-4', className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'mt-auto flex flex-col gap-2 border-t border-rule-soft px-4 py-3',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-read leading-[1.3] font-bold', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-label font-semibold', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
